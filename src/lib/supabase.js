import { createClient } from "@supabase/supabase-js";

// Carrega credenciais de variáveis de ambiente
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://iepgeibcwthilohdlfse.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Valida se as credenciais estão configuradas
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    "⚠️ Credenciais Supabase não configuradas completamente. Funcionando em modo de prototipagem.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  headers: {
    "X-Client-Info": "agro-coletivo@0.21.0",
  },
});
