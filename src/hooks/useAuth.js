import { useState, useCallback, useEffect, useRef } from "react";
import {
  login,
  register,
  logout,
  deleteAccount,
  getSession,
  saveSession,
  clearSession,
} from "../lib/auth";
import { supabase } from "../lib/supabase.js";

export function useAuth() {
  const [user, setUser] = useState(() => getSession());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // userId pendente de verificação de email (após registro)
  const [pendingVerificationUser, setPendingVerificationUser] = useState(null);
  const manualAuthInProgress = useRef(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (manualAuthInProgress.current) return;
      if (event === "SIGNED_OUT") {
        clearSession();
        setUser(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    manualAuthInProgress.current = true;
    try {
      clearSession();
      const u = await login(email, password);
      saveSession(u);
      setUser(u);
      setPendingVerificationUser(null);
    } catch (err) {
      const msg = err?.message || "Erro desconhecido ao fazer login";
      // Se email não verificado, busca o userId para mostrar tela de confirmação
      if (msg === "EMAIL_NOT_VERIFIED") {
        // Busca o userId pelo email para poder reenviar código
        try {
          const { data } = await supabase
            .from("users")
            .select("id, name, email")
            .eq("email", email)
            .maybeSingle();
          if (data) {
            const pendingUser = { id: data.id, name: data.name, email: data.email };
            localStorage.setItem("agro_auth", JSON.stringify(pendingUser));
            setPendingVerificationUser(pendingUser);
          }
        } catch {}
        setError("Você precisa confirmar seu email antes de entrar. Verifique sua caixa de entrada.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
      setTimeout(() => { manualAuthInProgress.current = false; }, 500);
    }
  }, []);

  const signUp = useCallback(async (email, password, role, extra = {}) => {
    setLoading(true);
    setError(null);
    manualAuthInProgress.current = true;
    try {
      clearSession();
      const result = await register(email, password, role, extra);
      // Salva apenas dados mínimos no localStorage para poder reenviar código
      const pendingUser = { id: result.id, name: result.name, email: result.email };
      localStorage.setItem("agro_auth", JSON.stringify(pendingUser));
      // NÃO faz login — apenas sinaliza que precisa de verificação
      setPendingVerificationUser(pendingUser);
    } catch (err) {
      setError(err?.message || "Erro desconhecido ao registrar");
    } finally {
      setLoading(false);
      setTimeout(() => { manualAuthInProgress.current = false; }, 500);
    }
  }, []);

  // Chamado pela ConfirmEmailPage quando o email for verificado com sucesso
  const onEmailVerified = useCallback(async () => {
    if (!pendingVerificationUser) return;
    // Faz login completo buscando os dados do usuário
    try {
      const { data } = await supabase
        .from("users")
        .select("id, name, email, phone, role, city, notes, active")
        .eq("id", pendingVerificationUser.id)
        .single();
      if (data) {
        const sessionUser = { ...data, blocked: data.active === false };
        saveSession(sessionUser);
        setUser(sessionUser);
      }
    } catch {}
    setPendingVerificationUser(null);
    localStorage.removeItem("agro_auth");
  }, [pendingVerificationUser]);

  const signOut = useCallback(async () => {
    clearSession();
    setUser(null);
    setError(null);
    setPendingVerificationUser(null);
    try { await logout(); } catch {}
  }, []);

  const deleteUserAccount = useCallback(
    async (password) => {
      setLoading(true);
      setError(null);
      try {
        await deleteAccount(password, user);
        clearSession();
        setUser(null);
      } catch (err) {
        setError(err?.message || "Erro ao deletar conta");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  // Recarrega dados do usuário do banco e atualiza sessão
  const refreshUser = useCallback(async (updatedData) => {
    if (updatedData) {
      // Se os dados já foram passados (ex: do updateUser), apenas atualiza
      const updated = { ...user, ...updatedData };
      saveSession(updated);
      setUser(updated);
    } else if (user?.id) {
      try {
        const { data } = await supabase
          .from("users")
          .select("id, name, email, phone, role, city, notes, active, profile_photo_url")
          .eq("id", user.id)
          .single();
        if (data) {
          const updated = { ...user, ...data };
          saveSession(updated);
          setUser(updated);
        }
      } catch {}
    }
  }, [user]);

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    deleteUserAccount,
    pendingVerificationUser,
    onEmailVerified,
    refreshUser,
  };
}
