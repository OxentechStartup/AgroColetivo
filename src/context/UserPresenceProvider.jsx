import { useState, useEffect, useCallback, useRef } from "react";
import UserPresenceContext from "./UserPresenceContext";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

/**
 * UserPresenceProvider — Provedor centralizado de presença de usuários
 *
 * Gerencia em tempo real:
 * - Quem está online
 * - Última atividade de cada usuário
 * - Status do usuário (ativo, inativo, digitando)
 * - Presença em campanhas específicas
 */

export function UserPresenceProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO
  // ─────────────────────────────────────────────────────────────────────────

  const [onlineUsers, setOnlineUsers] = useState({});
  const [userActivity, setUserActivity] = useState({});
  const [presenceChannel, setPresenceChannel] = useState(null);
  const heartbeatIntervalRef = useRef(null);
  const subscriptionsRef = useRef({});

  // ─────────────────────────────────────────────────────────────────────────
  // ATUALIZAR PRESENÇA DO USUÁRIO
  // ─────────────────────────────────────────────────────────────────────────

  const updateUserPresence = useCallback(
    (status = "active", campaignId = null) => {
      if (!user?.id) return;

      const presenceData = {
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email,
        user_email: user.email,
        status, // 'active', 'inactive', 'typing'
        last_activity: new Date().toISOString(),
        campaign_id: campaignId,
        role: user.user_metadata?.role,
      };

      // Enviar para canal de presença
      if (presenceChannel) {
        presenceChannel.send({
          type: "broadcast",
          event: "user_presence",
          payload: presenceData,
        });
      }

      // Salvar no estado local
      setOnlineUsers((prev) => ({
        ...prev,
        [user.id]: presenceData,
      }));
    },
    [user, presenceChannel],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // REGISTRAR ATIVIDADE DO USUÁRIO
  // ─────────────────────────────────────────────────────────────────────────

  const recordActivity = useCallback(
    (activityType, campaignId = null, details = {}) => {
      if (!user?.id) return;

      const activity = {
        user_id: user.id,
        type: activityType, // 'view', 'edit', 'click', 'typing', etc
        campaign_id: campaignId,
        timestamp: new Date().toISOString(),
        details,
      };

      setUserActivity((prev) => ({
        ...prev,
        [user.id]: activity,
      }));

      // Broadcast para outras abas/dispositivos
      if (presenceChannel) {
        presenceChannel.send({
          type: "broadcast",
          event: "user_activity",
          payload: activity,
        });
      }

      // Salvar na DB para auditoria (async, não bloqueia UI)
      saveActivityLog(activity).catch(console.error);
    },
    [user?.id, presenceChannel],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFICAR SE USUÁRIO ESTÁ ONLINE
  // ─────────────────────────────────────────────────────────────────────────

  const isUserOnline = useCallback(
    (userId) => {
      return !!onlineUsers[userId];
    },
    [onlineUsers],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // OBTER STATUS DE USUÁRIO
  // ─────────────────────────────────────────────────────────────────────────

  const getUserStatus = useCallback(
    (userId) => {
      return onlineUsers[userId]?.status || "offline";
    },
    [onlineUsers],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // OBTER USUÁRIOS ONLINE EM UMA CAMPANHA
  // ─────────────────────────────────────────────────────────────────────────

  const getOnlineUsersInCampaign = useCallback(
    (campaignId) => {
      return Object.values(onlineUsers).filter(
        (u) => u.campaign_id === campaignId && u.status !== "offline",
      );
    },
    [onlineUsers],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SALVAR LOG DE ATIVIDADE (NO BANCO DE DADOS)
  // ─────────────────────────────────────────────────────────────────────────

  async function saveActivityLog(activity) {
    try {
      await supabase.from("user_activities").insert([activity]);
    } catch (error) {
      console.error("Erro ao salvar log de atividade:", error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEARTBEAT — MANTER PRESENÇA ATIVA
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Enviar heartbeat a cada 30 segundos
    heartbeatIntervalRef.current = setInterval(() => {
      updateUserPresence("active");
    }, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isAuthenticated, user?.id, updateUserPresence]);

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURAR CANAL REALTIME
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    try {
      // Canal de presença (broadcast para todos)
      const channel = supabase.channel("user:presence", {
        config: {
          broadcast: { self: true },
        },
      });

      // Receber atualizações de outros usuários
      channel.on("broadcast", { event: "user_presence" }, (payload) => {
        setOnlineUsers((prev) => ({
          ...prev,
          [payload.payload.user_id]: payload.payload,
        }));
      });

      channel.on("broadcast", { event: "user_activity" }, (payload) => {
        setUserActivity((prev) => ({
          ...prev,
          [payload.payload.user_id]: payload.payload,
        }));
      });

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Canal de presença conectado");
          // Notificar que este usuário está online
          updateUserPresence("active");
        }
      });

      setPresenceChannel(channel);
      subscriptionsRef.current.presence = channel;

      return () => {
        channel?.unsubscribe();
      };
    } catch (error) {
      console.error("❌ Erro ao configurar canal de presença:", error);
    }
  }, [isAuthenticated, user?.id, updateUserPresence]);

  // ─────────────────────────────────────────────────────────────────────────
  // NOTIFICAR QUE USUÁRIO SAIU
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (isAuthenticated && user?.id) {
        updateUserPresence("offline");
        Object.values(subscriptionsRef.current).forEach((sub) => {
          if (sub?.unsubscribe) {
            sub.unsubscribe();
          }
        });
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // VALOR DO CONTEXTO
  // ─────────────────────────────────────────────────────────────────────────

  const contextValue = {
    onlineUsers,
    userActivity,
    updateUserPresence,
    recordActivity,
    isUserOnline,
    getUserStatus,
    getOnlineUsersInCampaign,
  };

  return (
    <UserPresenceContext.Provider value={contextValue}>
      {children}
    </UserPresenceContext.Provider>
  );
}
