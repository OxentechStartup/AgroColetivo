import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const GLOBAL_CLIENT_KEY = "__agrocoletivo_email_security_client__";

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  if (!globalThis[GLOBAL_CLIENT_KEY]) {
    globalThis[GLOBAL_CLIENT_KEY] = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }

  return globalThis[GLOBAL_CLIENT_KEY];
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) return realIp;

  return req.socket?.remoteAddress || "unknown";
}

export function sanitizeString(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function validateEmailInput(email, name, code) {
  const errors = [];

  if (!email || typeof email !== "string") {
    errors.push("Email é obrigatório");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Email inválido");
  }

  if (name !== undefined && typeof name !== "string") {
    errors.push("Nome inválido");
  }

  if (!code || typeof code !== "string") {
    errors.push("Código é obrigatório");
  } else if (!/^\d{6}$/.test(code)) {
    errors.push("Código de verificação inválido");
  }

  return { valid: errors.length === 0, errors };
}

const RATE_LIMITS = {
  perEmail: { max: 3, windowMs: 24 * 60 * 60 * 1000 },
  perIp: { max: 10, windowMs: 60 * 60 * 1000 },
};

const rateState = {
  email: new Map(),
  ip: new Map(),
};

function checkBucket(map, key, config) {
  const now = Date.now();
  const entries = map.get(key) || [];
  const recent = entries.filter((t) => now - t < config.windowMs);

  if (recent.length >= config.max) {
    const retryAfter = Math.ceil(
      (recent[0] + config.windowMs - now) / 1000,
    );
    return { allowed: false, retryAfter };
  }

  recent.push(now);
  map.set(key, recent);
  return { allowed: true, retryAfter: null };
}

export function checkRateLimit(clientIp, email) {
  const ipKey = clientIp || "unknown";
  const emailKey = email || "unknown";

  const ipCheck = checkBucket(rateState.ip, ipKey, RATE_LIMITS.perIp);
  if (!ipCheck.allowed) {
    return {
      allowed: false,
      reason: "rate_limit_ip",
      retryAfter: ipCheck.retryAfter,
    };
  }

  const emailCheck = checkBucket(rateState.email, emailKey, RATE_LIMITS.perEmail);
  if (!emailCheck.allowed) {
    return {
      allowed: false,
      reason: "rate_limit_email",
      retryAfter: emailCheck.retryAfter,
    };
  }

  return { allowed: true, reason: null, retryAfter: null };
}

export async function logEmailAttempt(
  type,
  recipientEmail,
  recipientName,
  subject,
  status = "pending",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("email_logs")
      .insert({
        type,
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        subject,
        status,
        service: "pending",
      })
      .select("id")
      .single();

    if (error) return null;
    return data?.id || null;
  } catch {
    return null;
  }
}

export async function updateEmailLogStatus(
  recipientEmail,
  status,
  service,
  messageId = null,
  errorMessage = null,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    await supabase
      .from("email_logs")
      .update({
        status,
        service,
        message_id: messageId,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("recipient_email", recipientEmail)
      .order("created_at", { ascending: false })
      .limit(1);
  } catch {
    return null;
  }

  return true;
}
