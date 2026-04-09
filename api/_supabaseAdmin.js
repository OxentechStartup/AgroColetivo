import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

let cachedAdminClient = null;

function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function extractProjectRefFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

export function getSupabaseAdminConfig() {
  const url =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || "";

  if (!url) {
    throw new Error("SUPABASE_URL (ou VITE_SUPABASE_URL) não configurado.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_ROLE) não configurado.",
    );
  }

  const payload = decodeJwtPayload(serviceRoleKey);
  const expectedRef = extractProjectRefFromUrl(url);
  const role = payload?.role;
  const tokenRef = payload?.ref;

  if (role !== "service_role") {
    throw new Error(
      "Chave de admin inválida: role diferente de service_role.",
    );
  }

  if (expectedRef && tokenRef && expectedRef !== tokenRef) {
    throw new Error(
      "Chave de admin inválida: projeto da chave não corresponde ao SUPABASE_URL.",
    );
  }

  return { url, serviceRoleKey };
}

export function getSupabaseAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const { url, serviceRoleKey } = getSupabaseAdminConfig();

  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}
