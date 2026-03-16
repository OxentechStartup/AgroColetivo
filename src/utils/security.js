/**
 * Módulo de segurança - validações, sanitização e rate limiting
 */

// ═══════════════════════════════════════════════════════════════════════════
// VALIDAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

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
 * Valida força de senha
 * @param {string} password - Senha a validar
 * @returns {object} { valid: boolean, strength: 'weak'|'medium'|'strong', errors: string[] }
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== "string") {
    return { valid: false, strength: "weak", errors: ["Senha é obrigatória"] };
  }

  if (password.length < 6) {
    errors.push("Mínimo 6 caracteres");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Deve conter letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Deve conter número");
  }

  // Validações fortes (mas não obrigatórias para demo)
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isLong = password.length >= 12;

  let strength = "weak";
  if (errors.length === 0) strength = "medium"; // Apenas requisitos mínimos
  if (hasUppercase && hasSpecial && isLong) strength = "strong"; // Tudo atendido

  return {
    valid: errors.length === 0,
    strength,
    errors: errors.slice(0, 2), // Retorna apenas os principais
  };
}

/**
 * Valida email
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Sanitiza string para evitar XSS
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
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/i,
    /on\w+\s*=/i,
    /javascript:/i,
    /data:text\/html/i,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

export default {
  validatePhone,
  validatePassword,
  validateEmail,
  sanitizeString,
  validateInput,
  loginLimiter,
  apiLimiter,
  registerLimiter,
  securityHeaders,
  isOriginAllowed,
  detectSQLInjection,
  detectXSS,
};
