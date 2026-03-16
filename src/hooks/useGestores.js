import { useState, useEffect } from "react";
import { ROLES } from "../constants/roles";
import { supabase } from "../lib/supabase";

// Hook para carregar lista de gestores (pivôs) do sistema
export function useGestores() {
  const [gestores, setGestores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("users")
      .select("id, name, phone, role, city, notes")
      .eq("role", ROLES.GESTOR)
      .order("name")
      .then(({ data }) => {
        setGestores(data ?? []);
        setLoading(false);
      });
  }, []);

  return { gestores, loading };
}

// Manter compatibilidade com código antigo (deprecated)
export function usePivos() {
  const { gestores, loading } = useGestores();
  return { pivos: gestores, loading };
}
