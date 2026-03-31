import { useState, useEffect } from "react";
import { ROLES } from "../constants/roles.js";
import { supabase } from "../lib/supabase.js";

// Hook para carregar lista de gestores (pivôs) do sistema
// Só executa se o usuário estiver autenticado (evita 401 no Vercel)
export function useGestores(user) {
  const [gestores, setGestores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Não busca sem sessão ativa — evita 401
    if (!user?.id) {
      setGestores([]);
      return;
    }

    setLoading(true);
    setError(null);

    supabase
      .from("users")
      .select("id, name, phone, role, city, notes")
      .eq("role", ROLES.GESTOR)
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          setError(error?.message || "Erro ao carregar gestores");
          setGestores([]);
        } else {
          setGestores(data ?? []);
        }
        setLoading(false);
      });
  }, [user?.id]);

  return { gestores, loading, error };
}

// Alias legado — mantém compatibilidade
export function usePivos(user) {
  const { gestores, loading, error } = useGestores(user);
  return { pivos: gestores, loading, error };
}
