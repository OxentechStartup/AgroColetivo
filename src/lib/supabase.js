import { createClient } from "@supabase/supabase-js";

const GLOBAL_SUPABASE_KEY = "__agrocoletivo_supabase_client__";
const GLOBAL_AUTH_LISTENER_KEY = "__agrocoletivo_auth_listener__";

// Vite usa import.meta.env (não process.env)
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("⚠️ Credenciais Supabase não configuradas.");
}

const supabaseClientConfig = {
  auth: {
    // ✅ Habilitar persistência de sessão para Supabase Auth nativo
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "agrocoletivo_supabase_auth_v1",
    // Evita disputa de lock entre abas que pode travar getSession no refresh
    multiTab: false,
  },
  headers: {
    "X-Client-Info": "agro-coletivo@0.22.0",
  },
};

export const supabase =
  globalThis[GLOBAL_SUPABASE_KEY] ||
  createClient(SUPABASE_URL, SUPABASE_KEY, supabaseClientConfig);

if (!globalThis[GLOBAL_SUPABASE_KEY]) {
  globalThis[GLOBAL_SUPABASE_KEY] = supabase;
}

// Intercepta erros de refresh token inválido
if (!globalThis[GLOBAL_AUTH_LISTENER_KEY]) {
  globalThis[GLOBAL_AUTH_LISTENER_KEY] = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (import.meta.env.DEV && event !== "INITIAL_SESSION") {
        console.log(
          `🔐 Auth event: ${event}`,
          session ? "with session" : "no session",
        );
      }
    },
  );
}
