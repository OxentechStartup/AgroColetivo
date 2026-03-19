import { createClient } from "@supabase/supabase-js";

// Suporta tanto Vite (import.meta.env) quanto Node.js (process.env)
const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  process.env.VITE_SUPABASE_URL ||
  "";
const SUPABASE_KEY =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("⚠️ Credenciais Supabase não configuradas.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // ⚠️ IMPORTANTE: Desabilitar persistSession e autoRefreshToken
    // Usuarios manuais não têm tokens Supabase, causando logout ao refresh
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: "agro_auth",
  },
  headers: {
    "X-Client-Info": "agro-coletivo@0.22.0",
  },
});

// Intercepta erros de refresh token inválido
// ⚠️ NÃO remove localStorage em SIGNED_OUT porque usuários manuais precisam manter a sessão
supabase.auth.onAuthStateChange((event, session) => {
  // Para contas Supabase Auth: se session expirou, será feito logout
  // Para contas manuais: ignorar changeEvents de Supabase, manter localStorage
  if (import.meta.env.DEV && event !== "INITIAL_SESSION") {
    console.log(
      `🔐 Auth event: ${event}`,
      session ? "with session" : "no session",
    );
  }
});
