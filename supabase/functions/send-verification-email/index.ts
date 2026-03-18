// Supabase Edge Function — send-verification-email
// Envia email de verificação via Gmail SMTP usando nodemailer
// Deploy: supabase functions deploy send-verification-email
//
// Variáveis de ambiente necessárias (Supabase → Settings → Edge Functions):
//   GMAIL_USER         = oxentech.startup@gmail.com
//   GMAIL_APP_PASSWORD = sua app password do Gmail

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, name, code } = await req.json();

    if (!email || !name || !code) {
      return new Response(
        JSON.stringify({ error: "email, name e