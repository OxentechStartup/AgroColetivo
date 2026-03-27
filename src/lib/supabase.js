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
    // ✅ Habilitar persistência de sessão para Supabase Auth nativo
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "supabase_auth",
  },
  headers: {
    "X-Client-Info": "agro-coletivo@0.22.0",
  },
});

// Intercepta erros de refresh token inválido
supabase.auth.onAuthStateChange((event, session) => {
  if (import.meta.env.DEV && event !== "INITIAL_SESSION") {
    console.log(
      `🔐 Auth event: ${event}`,
      session ? "with session" : "no session",
    );
  }
});
