import { useState, useEffect, useCallback, useRef } from "react";
import { ROLES } from "../constants/roles.js";
import { supabase } from "../lib/supabase.js";
import {
  isRealtimeAvailable,
  markRealtimeFailure,
  clearRealtimeBackoff,
  cleanupRealtimeChannel,
} from "../lib/realtimeGuard.js";

const GESTORES_SYNC_DEBOUNCE_MS = 600;
const GESTORES_SYNC_INTERVAL_MS = 60000;

// Hook para carregar lista de gestores (pivôs) do sistema
// Só executa se o usuário estiver autenticado (evita 401 no Vercel)
export function useGestores(user) {
  const [gestores, setGestores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const syncTimerRef = useRef(null);
  const syncInFlightRef = useRef(false);

  const loadGestores = useCallback(
    async ({ silent = false } = {}) => {
      // Não busca sem sessão ativa — evita 401
      if (!user?.id) {
        setGestores([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (!silent) setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, phone, role, city, notes")
          .eq("role", ROLES.GESTOR)
          .order("name");

        if (error) {
          throw new Error(error?.message || "Erro ao carregar gestores");
        }

        setGestores(data ?? []);
      } catch (err) {
        if (!silent) setGestores([]);
        setError(err?.message || "Erro ao carregar gestores");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user?.id],
  );

  const syncNow = useCallback(async () => {
    if (!user?.id || syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    try {
      await loadGestores({ silent: true });
    } finally {
      syncInFlightRef.current = false;
    }
  }, [loadGestores, user?.id]);

  const scheduleSync = useCallback(
    (delay = GESTORES_SYNC_DEBOUNCE_MS) => {
      if (!user?.id) return;

      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }

      syncTimerRef.current = setTimeout(() => {
        syncNow().catch(() => {});
      }, delay);
    },
    [syncNow, user?.id],
  );

  useEffect(() => {
    loadGestores();
  }, [loadGestores]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !isRealtimeAvailable()) return;

    const onChange = () => scheduleSync();
    const channel = supabase
      .channel(`gestores_sync_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `role=eq.${ROLES.GESTOR}`,
        },
        onChange,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearRealtimeBackoff();
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          markRealtimeFailure("useGestores", status);
          cleanupRealtimeChannel(supabase, channel);
        }
      });

    return () => {
      cleanupRealtimeChannel(supabase, channel);
    };
  }, [scheduleSync, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const refreshOnResume = () => scheduleSync(0);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleSync(0);
      }
    };

    window.addEventListener("focus", refreshOnResume);
    window.addEventListener("online", refreshOnResume);
    window.addEventListener("pageshow", refreshOnResume);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshOnResume);
      window.removeEventListener("online", refreshOnResume);
      window.removeEventListener("pageshow", refreshOnResume);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [scheduleSync, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const intervalId = setInterval(() => {
      scheduleSync(0);
    }, GESTORES_SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [scheduleSync, user?.id]);

  return { gestores, loading, error };
}

// Alias legado — mantém compatibilidade
export function usePivos(user) {
  const { gestores, loading, error } = useGestores(user);
  return { pivos: gestores, loading, error };
}
