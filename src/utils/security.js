/**
 * Módulo de segurança - validações, sanitização e rate limiting
 */
import DOMPurify from "dompurify";

// ═══════════════════════════════════════════════════════════════════════════
// VALIDAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida e-mail
 * @param {string} email - Email a validar
 * @returns {object} { valid: boolean, clean: string, error?: string }
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, clean: "", error: "Email inválido" };
  }

  const clean = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(clean)) {
    return {
      valid: false,
      clean: "",
      error: "Email deve estar no formato válido (ex: usuario@exemplo.com)",
    };
  }

  return { valid: true, clean, error: null };
}

/**
 * Valida e sanitiza número de telefone
 * @param {string} phone - Telefone com ou sem máscara
 * @returns {object} { valid: boolean, clean: string, error?: string }
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== "string") {
    return { valid: false, clean: "", error: "Telefone inválido" };
  }

  const clean = phone.replace(/\D/g, "");

  // Valida: mínimo 10 dígitos (DDD + 8 ou 9 dígitos)
  // Aceita números reais e números de demonstração (00000000000, etc)
  if (!/^\d{10,}$/.test(clean)) {
    return {
      valid: false,
      clean: "",
      error: "Telefone deve ter DDD + 8 ou 9 dígitos",
    };
  }

  return { valid: true, clean, error: null };
}

/**
 * Valida força de senha (REFORÇADO)
 * @param {string} password - Senha a validar
 * @returns {object} { valid: boolean, strength: 'weak'|'medium'|'strong', errors: string[] }
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== "string") {
    return { valid: false, strength: "weak", errors: ["Senha é obrigatória"] };
  }

  // Requisitos mínimos REFORÇADOS
  if (password.length < 8) {
    errors.push("Mínimo 8 caracteres");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Deve conter letra minúscula (a-z)");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Deve conter letra MAIÚSCULA (A-Z)");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Deve conter número (0-9)");
  }

  // Rejeita padrões muito comuns/fracos
  const commonPatterns = [
    /^(.)\1+$/, // "aaaaaaa" (repetição)
    /^[0-9]{8,}$/, // "12345678" (só números)
    /^[a-z]{8,}$/, // "abcdefgh" (só letras minúsculas)
    /^[A-Z]{8,}$/, // "ABCDEFGH" (só letras maiúsculas)
    /^(123|234|345|456|567|678|789|890|qwerty|asdfgh|zxcvbn)/i, // padrões de teclado
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push("Senha muito previsível (évite sequências, repetições)");
      break;
    }
  }

  let strength = "weak";
  if (errors.length === 0) {
    strength = "medium"; // Atendeu requisitos mínimos
    // Strong se tem caracteres especiais + 12+ chars
    if (
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) &&
      password.length >= 12
    ) {
      strength = "strong";
    }
  }

  return {
    valid: errors.length === 0,
    strength,
    errors: errors.slice(0, 3), // Retorna até 3 erros
  };
}

/**
 * Sanitiza string para evitar XSS com DOMPurify (robusto)
 * @param {string} str - String a sanitizar
 * @returns {string}
 */
export function sanitizeHTML(str) {
  if (typeof str !== "string") return "";

  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "br", "p"],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitiza string para evitar XSS (method simples, mantido para compatibilidade)
 * @param {string} str - String a sanitizar
 * @returns {string}
 */
export function sanitizeString(str) {
  if (typeof str !== "string") return "";

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Valida dados de entrada antes de enviar ao banco
 * @param {object} data - Dados a validar
 * @param {object} schema - Schema de validação { field: 'type|required|max:100' }
 * @returns {object} { valid: boolean, errors: { field: string[] } }
 */
export function validateInput(data, schema) {
  const errors = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const ruleList = rules.split("|");

    for (const rule of ruleList) {
      // required
      if (
        rule === "required" &&
        (!value || (typeof value === "string" && !value.trim()))
      ) {
        if (!errors[field]) errors[field] = [];
        errors[field].push(`${field} é obrigatório`);
      }

      // string
      if (rule === "string" && value && typeof value !== "string") {
        if (!errors[field]) errors[field] = [];
        errors[field].push(`${field} deve ser texto`);
      }

      // number
      if (rule === "number" && value && isNaN(value)) {
        if (!errors[field]) errors[field] = [];
        errors[field].push(`${field} deve ser número`);
      }

      // max
      const maxMatch = rule.match(/^max:(\d+)$/);
      if (
        maxMatch &&
        value &&
        value.toString().length > parseInt(maxMatch[1])
      ) {
        if (!errors[field]) errors[field] = [];
        errors[field].push(`${field} máximo ${maxMatch[1]} caracteres`);
      }

      // min
      const minMatch = rule.match(/^min:(\d+)$/);
      if (
        minMatch &&
        value &&
        value.toString().length < parseInt(minMatch[1])
      ) {
        if (!errors[field]) errors[field] = [];
        errors[field].push(`${field} mínimo ${minMatch[1]} caracteres`);
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  /**
   * Verifica se a requisição deve ser bloqueada
   * @param {string} key - Identificador único (IP, user ID, etc)
   * @returns {object} { allowed: boolean, remaining: number, retryAfter?: number }
   */
  check(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // Remove requisições fora da janela
    const validRequests = userRequests.filter(
      (time) => now - time < this.windowMs,
    );

    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = validRequests[0];
      const retryAfter = Math.ceil(
        (oldestRequest + this.windowMs - now) / 1000,
      );

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);

    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
      retryAfter: null,
    };
  }

  /**
   * Reseta o rate limit para uma chave
   */
  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Retorna estatísticas
   */
  stats() {
    return {
      totalKeys: this.requests.size,
      entries: Array.from(this.requests.entries()).map(([key, times]) => ({
        key,
        requestCount: times.length,
      })),
    };
  }
}

// Instâncias de rate limiting
export const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 tentativas por 15 minutos
export const apiLimiter = new RateLimiter(30, 60 * 1000); // 30 requisições por minuto
export const registerLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 registros por hora

// ═══════════════════════════════════════════════════════════════════════════
// HEADERS DE SEGURANÇA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retorna headers de segurança para respostas
 */
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://iepgeibcwthilohdlfse.supabase.co; frame-ancestors 'none'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICAÇÕES DE SEGURANÇA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica se a origem é permitida (CORS)
 */
export function isOriginAllowed(origin) {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://agrocoletivo.vercel.app",
    "https://www.agrocoletivo.com.br",
  ];

  return allowedOrigins.includes(origin);
}

/**
 * Detecta tentativa de SQL Injection
 */
export function detectSQLInjection(input) {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b).*=.*'/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detecta XSS malicioso
 */
export function detectXSS(input) {
  if (!input || typeof input !== "string") return false;

  // PADRÕES DE XSS (mais robustos)
  const xssPatterns = [
    // Tags script/iframe/embed
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,

    // Event handlers (on*)
    /on(load|error|click|focus|blur|change|submit|keydown|keyup|mouseover|mouseout)\s*=/gi,
    /javascript\s*:/gi,

    // Data URIs (HTML/SVG)
    /data:text\/html/gi,
    /data:application\/x-javascript/gi,
    /data:image\/svg\+xml/gi,

    // Encoded attacks (unicode, hex, etc)
    /&#\d{4,5};/g, // numeric entities
    /\\x[0-9a-f]{2,4}/gi, // hex encoding
    /\\u[0-9a-f]{4}/gi, // unicode

    // SVG attacks
    /<svg[^>]*on/gi,

    // STYLE attacks
    /<style[^>]*>.*?<\/style>/gi,
    /expression\s*\(/gi,
    /behavior\s*:/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING DISTRIBUÍDO (usando Supabase)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registra tentativa de autenticação/ação no Supabase para rate limiting
 * Este é um exemplo de como você poderia usar Supabase para rate limiting distribuído.
 * Para usar isso, você precisaria:
 *
 * 1. Criar uma tabela 'rate_limit_logs' no Supabase:
 *    CREATE TABLE rate_limit_logs (
 *      id BIGSERIAL PRIMARY KEY,
 *      identifier VARCHAR(255) NOT NULL,
 *      action VARCHAR(50) NOT NULL,
 *      attempted_at TIMESTAMP DEFAULT NOW(),
 *      ip_address VARCHAR(45),
 *      user_agent TEXT
 *    );
 *
 * 2. Adicionar índice para performance:
 *    CREATE INDEX idx_rate_limit_logs_identifier_action
 *    ON rate_limit_logs(identifier, action, attempted_at DESC);
 *
 * 3. Habilitar Row Level Security (RLS) com política pública (apenas insert):
 *    CREATE POLICY "Allow insertion for rate limiting"
 *    ON rate_limit_logs FOR INSERT TO anon, authenticated
 *    WITH CHECK (true);
 *
 * Exemplo de uso em auth.js:
 *    import { checkDistributedRateLimit } from '../utils/security.js';
 *
 *    const limiter = await checkDistributedRateLimit(phone, 'login', 5, 15*60);
 *    if (!limiter.allowed) {
 *      throw new Error(`Muitas tentativas. Tente novamente em ${limiter.retryAfter}s`);
 *    }
 *
 * @param {string} identifier - Telefone, email ou IP para identificar o usuário
 * @param {string} action - Tipo de ação ('login', 'register', 'password_reset')
 * @param {number} maxAttempts - Máximo de tentativas permitidas
 * @param {number} windowSeconds - Janela de tempo em segundos
 * @param {object} supabase - Cliente Supabase
 * @returns {Promise<object>} { allowed: boolean, remaining: number, retryAfter?: number }
 */
export async function checkDistributedRateLimit(
  identifier,
  action,
  maxAttempts,
  windowSeconds,
  supabase,
) {
  try {
    // Se supabase não for fornecido, retorna permitido (fallback)
    if (!supabase) {
      return { allowed: true, remaining: maxAttempts };
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);

    // Conta tentativas recentes
    const { count, error: countError } = await supabase
      .from("rate_limit_logs")
      .select("*", { count: "exact", head: true })
      .eq("identifier", identifier)
      .eq("action", action)
      .gte("attempted_at", windowStart.toISOString());

    if (countError) {
      // Se houver erro na query, permite a requisição (fallback seguro)
      console.warn("Rate limit check failed:", countError);
      return { allowed: true, remaining: maxAttempts };
    }

    const attempts = count || 0;

    if (attempts >= maxAttempts) {
      // Bloqueia requisição
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil(windowSeconds),
      };
    }

    // Log tentativa bem-sucedida
    await supabase.from("rate_limit_logs").insert({
      identifier,
      action,
      attempted_at: now.toISOString(),
      ip_address:
        typeof window !== "undefined"
          ? window.navigator?.connection?.localAddress
          : null,
    });

    return {
      allowed: true,
      remaining: maxAttempts - attempts - 1,
    };
  } catch (error) {
    // Em caso de erro, permite a requisição (fallback seguro)
    console.warn("Distributed rate limit check error:", error);
    return { allowed: true, remaining: maxAttempts };
  }
}

export default {
  validatePhone,
  validatePassword,
  validateEmail,
  sanitizeHTML,
  sanitizeString,
  validateInput,
  loginLimiter,
  apiLimiter,
  registerLimiter,
  securityHeaders,
  isOriginAllowed,
  detectSQLInjection,
  detectXSS,
  checkDistributedRateLimit,
};
