/**
 * 🔒 SEGURANÇA: Sanitização de logs console
 * Remove URLs sensíveis (Supabase, API keys) dos logs do navegador
 * Isso evita expor infraestrutura em produção
 */

// Lista de padrões sensíveis a remover
const SENSITIVE_PATTERNS = [
  /https?:\/\/[a-z0-9]+\.supabase\.(co|com)[^\s"]*/gi, // URLs Supabase
  /Bearer\s+[a-zA-Z0-9\-_\.]+/gi, // JWT tokens
  /eyJ[a-zA-Z0-9\-_\.]+/gi, // JWT tokens alternativos
  /(api[-_]?key|secret|password)\s*[:=]\s*[^\s"'`]*/gi, // Credenciais
];

const SUPABASE_ERROR_MESSAGES = {
  invalid_grant: "Email ou senha incorretos.",
  user_not_found: "Email ou senha incorretos.",
  invalid_credentials: "Email ou senha incorretos.",
  email_not_confirmed: "Confirme seu email antes de entrar.",
  user_already_exists: "Este email já está cadastrado.",
};

/**
 * Sanitiza uma mensagem removendo URLs e dados sensíveis
 */
export function sanitizeMessage(message) {
  if (typeof message !== "string") return message;

  let sanitized = message;
  SENSITIVE_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  });
  return sanitized;
}

/**
 * Extrai mensagem de erro user-friendly do Supabase
 */
export function parseSupabaseError(error) {
  if (!error) return null;

  const message = error?.message || String(error);
  const status = error?.status;

  // Erro 400 geralmente é credencial inválida
  if (status === 400) {
    return "Email ou senha incorretos.";
  }

  // Verifica mensagens conhecidas
  for (const [key, userMsg] of Object.entries(SUPABASE_ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key)) {
      return userMsg;
    }
  }

  // Retorna sanitizada
  return sanitizeMessage(message);
}

/**
 * Inicializa interceptador de console para produção
 * Remove URLs sensíveis de todos os logs
 */
export function initConsoleSecurityFilter() {
  // Não fazer isso em desenvolvimento
  if (import.meta.env.DEV) return;

  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  const sanitizeArgs = (args) => {
    return args.map((arg) => {
      if (typeof arg === "string") {
        return sanitizeMessage(arg);
      }
      return arg;
    });
  };

  console.error = function (...args) {
    originalError(...sanitizeArgs(args));
  };

  console.warn = function (...args) {
    originalWarn(...sanitizeArgs(args));
  };

  console.log = function (...args) {
    originalLog(...sanitizeArgs(args));
  };
}

/**
 * Suprime erros de rede do Supabase no console
 * Sem impedir o tratamento de erro na aplicação
 */
export function suppressSupabaseNetworkErrors() {
  window.addEventListener(
    "error",
    (event) => {
      // Se for erro de rede do Supabase, suprimir (não cancela a bolha)
      if (event.message?.includes("supabase")) {
        event.preventDefault?.();
      }
    },
    true,
  );

  // Também intercepta erros não-capturados
  window.addEventListener(
    "unhandledrejection",
    (event) => {
      const error = event.reason;
      if (error?.message?.includes("supabase") || error?.status === 400) {
        // Log sanitizado apenas se for realmente importante
        // console.debug("Auth attempt:", sanitizeMessage(error.message));
      }
    },
    true,
  );
}
