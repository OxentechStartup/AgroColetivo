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
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "agro_auth",
  },
  headers: {
    "X-Client-Info": "agro-coletivo@0.22.0",
  },
});

// Intercepta erros de refresh token inválido e faz logout automático
supabase.auth.onAuthStateChange((event, session) => {
  // Se o token expirou ou foi inválido, faz logout silencioso
  if (event === "SIGNED_OUT" && !session) {
    try {
      localStorage.removeItem("agro_auth");
    } catch {}
  }
});
