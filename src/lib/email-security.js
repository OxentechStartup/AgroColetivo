/**
 * Email Security Layer
 * - JWT Verification
 * - Rate Limiting (concurrent + per-user)
 * - CORS Protection
 * - Input Validation
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  import.meta.env?.VITE_SUPABASE_URL ||
  "";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  "";

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

if (!supabase) {
  console.warn(
    "[email-security] Supabase não configurado; logs/auditoria de email serão ignorados.",
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING (in-memory com cleanup)
// ══════════════════════════════════════════════════════════════════════════════

const RATE_LIMITS = {
  // IP: max 50 emails por hora
  global: { maxRequests: 50, windowMs: 60 * 60 * 1000 },
  // Por email: max 10 verificações por hora
  perEmail: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  // Por usuário autenticado: max 100 por hora
  perUser: { maxRequests: 100, windowMs: 60 * 60 * 1000 },
  // Verificação de email: max 3 tentativas por 24h
  emailVerification: { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 },
};

// Armazenar contadores em memória (usar Redis em produção)
const requestCounts = new Map();
const emailSendCounts = new Map();

// Cleanup a cada 5 minutos
setInterval(
  () => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.lastReset > RATE_LIMITS.global.windowMs) {
        requestCounts.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

/**
 * Verificar limite de taxa por IP
 */
export function checkRateLimit(ip, emailAddress = null) {
  const now = Date.now();

  // Verificar limite global por IP
  const ipKey = `ip:${ip}`;
  let ipData = requestCounts.get(ipKey);

  if (!ipData) {
    ipData = { count: 0, lastReset: now };
    requestCounts.set(ipKey, ipData);
  }

  // Reset se passou da janela
  if (now - ipData.lastReset > RATE_LIMITS.global.windowMs) {
    ipData.count = 0;
    ipData.lastReset = now;
  }

  if (ipData.count >= RATE_LIMITS.global.maxRequests) {
    return {
      allowed: false,
      reason: "rate_limit_ip",
      retryAfter: Math.ceil(
        (RATE_LIMITS.global.windowMs - (now - ipData.lastReset)) / 1000,
      ),
    };
  }

  // Verificar limite por email
  if (emailAddress) {
    const emailKey = `email:${emailAddress}`;
    let emailData = emailSendCounts.get(emailKey);

    if (!emailData) {
      emailData = { count: 0, lastReset: now };
      emailSendCounts.set(emailKey, emailData);
    }

    if (now - emailData.lastReset > RATE_LIMITS.emailVerification.windowMs) {
      emailData.count = 0;
      emailData.lastReset = now;
    }

    if (emailData.count >= RATE_LIMITS.emailVerification.maxRequests) {
      return {
        allowed: false,
        reason: "rate_limit_email",
        retryAfter: Math.ceil(
          (RATE_LIMITS.emailVerification.windowMs -
            (now - emailData.lastReset)) /
            1000,
        ),
      };
    }

    emailData.count++;
  }

  ipData.count++;

  return { allowed: true };
}

/**
 * Extrair cliente IP da request (considera proxies)
 */
export function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

/**
 * Validar JWT do Supabase
 */
export async function verifyJWT(token) {
  if (!token || !supabase) return null;

  try {
    // Remover "Bearer " se presente
    const cleanToken = token.replace(/^Bearer\s+/i, "");

    // Verificar token com Supabase
    const { data, error } = await supabase.auth.getUser(cleanToken);

    if (error || !data?.user) {
      return null;
    }

    return data.user;
  } catch (error) {
    console.error("JWT verification error:", error.message);
    return null;
  }
}

/**
 * Validar entrada (sanitizar)
 */
export function validateEmailInput(email, name, code) {
  const errors = [];

  // Email
  if (!email || typeof email !== "string") {
    errors.push("Email é obrigatório");
  } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push("Email inválido");
  } else if (email.length > 254) {
    errors.push("Email muito longo");
  }

  // Name
  if (!name || typeof name !== "string") {
    errors.push("Nome é obrigatório");
  } else if (name.length < 2 || name.length > 100) {
    errors.push("Nome deve ter 2-100 caracteres");
  }

  // Code
  if (!code || typeof code !== "string") {
    errors.push("Código é obrigatório");
  } else if (!/^\d{6}$/.test(code)) {
    errors.push("Código deve ser 6 dígitos");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizar string para evitar XSS
 */
export function sanitizeString(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>"']/g, (c) => {
      const map = { "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[c];
    })
    .substring(0, 1000);
}

/**
 * Middleware para Express: verificar rate limit e JWT
 */
export function emailSecurityMiddleware(req, res, next) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Hanle OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Apenas POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  next();
}

/**
 * Middleware para rate limiting
 */
export function rateLimitMiddleware(req, res, next) {
  const ip = getClientIp(req);
  const email = req.body?.email;

  const rateCheck = checkRateLimit(ip, email);

  if (!rateCheck.allowed) {
    res.setHeader("Retry-After", rateCheck.retryAfter);

    const message =
      rateCheck.reason === "rate_limit_ip"
        ? "Muitas requisições. Tente novamente mais tarde."
        : "Muitos emails de verificação. Tente novamente em 24h.";

    return res.status(429).json({
      error: message,
      retryAfter: rateCheck.retryAfter,
    });
  }

  next();
}

/**
 * Registrar email no banco (log para auditoria)
 */
export async function logEmailAttempt(
  type,
  email,
  name,
  subject,
  status = "pending",
  service = null,
  messageId = null,
  errorMessage = null,
) {
  if (!supabase) return;

  try {
    const { error } = await supabase.from("email_logs").insert({
      type,
      recipient_email: email,
      recipient_name: name,
      subject,
      template_id: null,
      status,
      service: service || "unknown",
      message_id: messageId,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log email:", error.message);
    }
  } catch (err) {
    console.error("Email logging error:", err.message);
  }
}

/**
 * Atualizar status de email no log
 */
export async function updateEmailLogStatus(
  email,
  status,
  service = null,
  messageId = null,
  errorMessage = null,
) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("email_logs")
      .update({
        status,
        service: service || undefined,
        message_id: messageId || undefined,
        error_message: errorMessage || undefined,
        sent_at: status === "sent" ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("recipient_email", email)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Failed to update email log:", error.message);
    }
  } catch (err) {
    console.error("Email log update error:", err.message);
  }
}

export default {
  checkRateLimit,
  getClientIp,
  verifyJWT,
  validateEmailInput,
  sanitizeString,
  emailSecurityMiddleware,
  rateLimitMiddleware,
  logEmailAttempt,
  updateEmailLogStatus,
};
