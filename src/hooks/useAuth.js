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
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState(() => getSession());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const manualAuthInProgress = useRef(false);

  useEffect(() => {
    // Escuta mudanças simples de autenticação
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (manualAuthInProgress.current) return;

      // Evento de logout ou sessão inválida
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
    } catch (err) {
      const errorMsg = err?.message || "Erro desconhecido ao fazer login";
      setError(errorMsg);
    } finally {
      setLoading(false);
      setTimeout(() => {
        manualAuthInProgress.current = false;
      }, 500);
    }
  }, []);

  const signUp = useCallback(async (email, password, role, extra = {}) => {
    setLoading(true);
    setError(null);
    manualAuthInProgress.current = true;
    try {
      clearSession();
      const u = await register(email, password, role, extra);
      saveSession(u);
      setUser(u);
    } catch (err) {
      const errorMsg = err?.message || "Erro desconhecido ao registrar";
      setError(errorMsg);
    } finally {
      setLoading(false);
      setTimeout(() => {
        manualAuthInProgress.current = false;
      }, 500);
    }
  }, []);

  const signOut = useCallback(async () => {
    clearSession();
    setUser(null);
    setError(null);
    try {
      await logout();
    } catch {
      // Ignora erros
    }
  }, []);

  const deleteUserAccount = useCallback(async (password) => {
    setLoading(true);
    setError(null);
    try {
      await deleteAccount(password);
      clearSession();
      setUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { user, loading, error, signIn, signUp, signOut, deleteUserAccount };
}
