import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

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

// Converte telefone em email fake usado internamente no Supabase Auth
// Ex: "38991110000" → "38991110000@agrocoletivo.app"
export function phoneToEmail(phone) {
  const clean = phone.replace(/\D/g, "");
  return `${clean}@agrocoletivo.app`;
}
