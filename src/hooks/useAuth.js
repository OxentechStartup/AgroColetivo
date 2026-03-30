import { useState, useCallback, useEffect, useRef } from "react";
import {
  login,
  register,
  logout,
  deleteAccount,
  getSession,
  saveSession,
  clearSession,
} from "../lib/auth-new.js";
import { supabase } from "../lib/supabase.js";
import { parseSupabaseError } from "../lib/security-console.js";

export function useAuth() {
  const [user, setUser] = useState(() => getSession());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // userId pendente de verificação de email (após registro)
  const [pendingVerificationUser, setPendingVerificationUser] = useState(null);
  const manualAuthInProgress = useRef(false);

  // Inicializa a sessão do Supabase Auth ao carregar
  useEffect(() => {
    const initSession = async () => {
      try {
        // Verifica se há sessão Supabase ativa
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Busca dados do usuário na tabela users
          const { data: userData } = await supabase
            .from("users")
            .select(
              "id, name, email, phone, role, city, notes, active, email_verified, profile_photo_url",
            )
            .eq("id", session.user.id)
            .single();

          if (userData) {
            saveSession(userData);
            setUser(userData);
          }
        } else {
          // Sem sessão Supabase, verifica localStorage manual
          const localUser = getSession();
          if (localUser) {
            setUser(localUser);
          }
        }
      } catch (err) {
        console.error("Erro ao inicializar sessão:", err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Escuta mudanças de autenticação do Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (manualAuthInProgress.current) return;

      if (event === "SIGNED_IN" && session?.user) {
        // Busca dados do usuário
        const { data: userData } = await supabase
          .from("users")
          .select(
            "id, name, email, phone, role, city, notes, active, email_verified, profile_photo_url",
          )
          .eq("id", session.user.id)
          .single();

        if (userData) {
          saveSession(userData);
          setUser(userData);
        }
      } else if (event === "SIGNED_OUT") {
        clearSession();
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    // Limpa qualquer estado pendente de registro anterior
    setPendingVerificationUser(null);
    localStorage.removeItem("agro_auth");
    manualAuthInProgress.current = true;
    try {
      const u = await login(email, password);
      saveSession(u);
      setUser(u);
    } catch (err) {
      const msg = err?.message || "Erro desconhecido ao fazer login";

      // Usuário legado que precisa migrar (resetar senha)
      if (
        err?.code === "LEGACY_USER" ||
        msg === "LEGACY_USER_REQUIRES_MIGRATION"
      ) {
        setError(
          "Sua conta precisa ser atualizada. Clique em 'Esqueceu?' para redefinir sua senha e migrar para o novo sistema.",
        );
        // Armazena o email para pré-preencher na tela de recuperação
        localStorage.setItem("agro_legacy_email", email);
        setPendingVerificationUser(null);
      } else if (msg === "EMAIL_NOT_VERIFIED") {
        // Usuário existe mas não verificou o email — busca dados para tela de confirmação
        try {
          const { data } = await supabase
            .from("users")
            .select("id, name, email")
            .eq("email", email)
            .maybeSingle();
          if (data) {
            const pendingUser = {
              id: data.id,
              name: data.name,
              email: data.email,
            };
            localStorage.setItem("agro_auth", JSON.stringify(pendingUser));
            setPendingVerificationUser(pendingUser);
            setError(
              "Confirme seu email antes de entrar. Verifique sua caixa de entrada.",
            );
          } else {
            // Email não existe na tabela users
            setError("Email ou senha incorretos.");
          }
        } catch {
          setError("Email ou senha incorretos.");
        }
      } else {
        // Qualquer outro erro: garante que não mostra tela de verificação
        // Usa parseSupabaseError para sanitizar qualquer URL sensível
        setPendingVerificationUser(null);
        localStorage.removeItem("agro_auth");
        const sanitizedError = parseSupabaseError(err) || msg;
        setError(sanitizedError);
      }
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
      const result = await register(email, password, role, extra);
      const pendingUser = {
        id: result.id,
        name: result.name,
        email: result.email,
        devCode: result.devCode, // código visível só em dev quando email falha
        emailSent: result.emailSent, // se o email foi enviado com sucesso
      };
      console.log("✅ Signup bem-sucedido - dados salvos:", {
        email: pendingUser.email,
        id: pendingUser.id,
      });
      localStorage.setItem(
        "agro_pending_registration",
        JSON.stringify(pendingUser),
      );
      setPendingVerificationUser(pendingUser);
    } catch (err) {
      const sanitizedError =
        parseSupabaseError(err) ||
        err?.message ||
        "Erro desconhecido ao registrar";
      setError(sanitizedError);
    } finally {
      setLoading(false);
      setTimeout(() => {
        manualAuthInProgress.current = false;
      }, 500);
    }
  }, []);

  // Chamado pela ConfirmEmailPage quando o email for verificado com sucesso
  // A conta foi criada automaticamente em Supabase Auth durante a verificação
  // Agora basta retornar à tela de login para autenticar
  const onEmailVerified = useCallback(async (verifyResult) => {
    if (!verifyResult || !verifyResult.email) return;

    try {
      // Email foi verificado e conta foi criada
      // Basta limpar o estado pendente para voltar à tela de login
      localStorage.removeItem("agro_pending_registration");

      console.log("✅ Email verificado com sucesso:", {
        email: verifyResult.email,
        id: verifyResult.id,
        message: "Conta criada! Pronto para fazer login",
      });

      // Limpar estado pendente para voltar à tela de login
      setPendingVerificationUser(null);
    } catch (err) {
      console.error("Erro ao processar verificação de email:", err);
      setError(err?.message || "Erro ao processar verificação de email");
    }
  }, []);

  const signOut = useCallback(async () => {
    clearSession();
    setUser(null);
    setError(null);
    setPendingVerificationUser(null);
    try {
      await supabase.auth.signOut();
      await logout();
    } catch {
      // handled by caller
    }
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
  const refreshUser = useCallback(
    async (updatedData) => {
      if (updatedData) {
        // Se os dados já foram passados (ex: do updateUser), apenas atualiza
        const updated = { ...user, ...updatedData };
        saveSession(updated);
        setUser(updated);
      } else if (user?.id) {
        try {
          const { data } = await supabase
            .from("users")
            .select(
              "id, name, email, phone, role, city, notes, active, profile_photo_url",
            )
            .eq("id", user.id)
            .single();
          if (data) {
            // Para vendors, sincroniza foto da tabela vendors se não existe em profile_photo_url
            if (data.role === "vendor" && !data.profile_photo_url) {
              const { data: vendor } = await supabase
                .from("vendors")
                .select("photo_url")
                .eq("user_id", user.id)
                .maybeSingle();
              if (vendor?.photo_url) {
                data.profile_photo_url = vendor.photo_url;
                // Sincroniza também na tabela users para próximas vezes
                await supabase
                  .from("users")
                  .update({ profile_photo_url: vendor.photo_url })
                  .eq("id", user.id);
              }
            }
            const updated = { ...user, ...data };
            saveSession(updated);
            setUser(updated);
          }
        } catch {
          // handled by caller
        }
      }
    },
    [user],
  );

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
