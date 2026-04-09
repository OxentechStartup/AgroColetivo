/**
 * Endpoint seguro para deletar conta
 * Requer Authorization: Bearer <access_token>
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig } from "./_supabaseAdmin.js";

let supabaseAdmin = null;

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const { url, serviceRoleKey } = getSupabaseAdminConfig();

  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "https://agro-coletivo.vercel.app",
  "https://agrocoletivo.onrender.com",
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

function applyCors(req, res) {
  const origin = req.headers.origin || req.headers.referer?.split("/")[2];
  if (origin && allowedOrigins.some((allowed) => origin.includes(allowed))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  let supabaseAdminClient;
  try {
    supabaseAdminClient = getSupabaseAdmin();
  } catch (configError) {
    return res.status(500).json({ error: "Service role não configurada" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: "Token ausente" });
    }

    const { data: authData, error: authError } =
      await supabaseAdminClient.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({ error: "Token inválido" });
    }

    const { userId } = req.body || {};
    const targetId = userId || authData.user.id;

    if (targetId !== authData.user.id) {
      return res.status(403).json({ error: "Operação não autorizada" });
    }

    const { data: userRow, error: userError } = await supabaseAdminClient
      .from("users")
      .select("id, role")
      .eq("id", targetId)
      .maybeSingle();

    if (userError || !userRow) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (userRow.role === "vendor") {
      await supabaseAdminClient
        .from("vendors")
        .delete()
        .eq("user_id", targetId);
    }

    await supabaseAdminClient.from("users").delete().eq("id", targetId);
    await supabaseAdminClient.auth.admin.deleteUser(targetId);

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao deletar conta",
      message:
        process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
}
