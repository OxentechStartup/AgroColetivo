/**
 * Middleware de Autorização e Controle de Acesso
 */

import { ROLES } from "../constants/roles";

// ═══════════════════════════════════════════════════════════════════════════
// AUTORIZAÇÃO BASEADA EM ROLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica se o usuário tem permissão para acessar um recurso
 * @param {object} user - Usuário autenticado
 * @param {string} requiredRole - Role requerido
 * @returns {boolean}
 */
export function hasRole(user, requiredRole) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true; // Admin tem acesso a tudo
  return user.role === requiredRole;
}

/**
 * Verifica se o usuário tem qualquer um dos roles
 * @param {object} user - Usuário autenticado
 * @param {string[]} roles - Array de roles permitidos
 * @returns {boolean}
 */
export function hasAnyRole(user, roles) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  return roles.includes(user.role);
}

/**
 * Verifica permissões granulares
 * @param {object} user - Usuário autenticado
 * @param {string} action - Ação (create, read, update, delete)
 * @param {string} resource - Recurso (campaigns, vendors, producers)
 * @returns {boolean}
 */
export function hasPermission(user, action, resource) {
  if (!user) return false;

  const permissions = {
    [ROLES.ADMIN]: {
      campaigns: ["create", "read", "update", "delete", "publish"],
      vendors: ["create", "read", "update", "delete"],
      producers: ["read"],
      financial: ["read", "update"],
    },
    [ROLES.GESTOR]: {
      campaigns: ["create", "read", "update", "delete", "publish"],
      vendors: ["create", "read", "update"], // Pode deletar apenas suas
      producers: ["read"],
      financial: ["read", "update"],
    },
    [ROLES.VENDOR]: {
      campaigns: ["read"],
      products: ["create", "read", "update", "delete"],
      profile: ["read", "update"],
    },
  };

  const userPermissions = permissions[user.role];
  if (!userPermissions) return false;

  const resourcePermissions = userPermissions[resource] || [];
  return resourcePermissions.includes(action);
}

/**
 * Verifica se o usuário é o proprietário do recurso
 * @param {object} user - Usuário autenticado
 * @param {string} resourceUserId - ID do dono do recurso
 * @returns {boolean}
 */
export function isResourceOwner(user, resourceUserId) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true; // Admin pode acessar tudo
  return user.id === resourceUserId;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROTEÇÃO DE DADOS SENSÍVEIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Remove campos sensíveis antes de enviar ao cliente
 * @param {object} data - Dados a filtrar
 * @param {object} user - Usuário autenticado
 * @returns {object}
 */
export function filterSensitiveFields(data, user) {
  if (!data) return data;

  // Campos sempre sensíveis
  const alwaysSensitive = ["password_hash", "password", "secret", "token"];

  // Cria uma cópia
  const filtered = { ...data };

  // Remove campos sensíveis
  alwaysSensitive.forEach((field) => {
    delete filtered[field];
  });

  // Se não é admin, remove mais campos
  if (user?.role !== ROLES.ADMIN) {
    delete filtered.fee_paid_by;
  }

  return filtered;
}

/**
 * Filtra array de dados removendo campos sensíveis
 * @param {array} array - Array de dados
 * @param {object} user - Usuário autenticado
 * @returns {array}
 */
export function filterSensitiveFieldsArray(array, user) {
  if (!Array.isArray(array)) return array;
  return array.map((item) => filterSensitiveFields(item, user));
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDAÇÕES DE SEGURANÇA PARA OPERAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida se uma operação é permitida
 * @param {object} user - Usuário autenticado
 * @param {string} action - Ação desejada
 * @param {string} resource - Recurso
 * @param {string} resourceOwnerId - ID do dono do recurso (opcional)
 * @returns {object} { allowed: boolean, reason?: string }
 */
export function validateOperation(user, action, resource, resourceOwnerId) {
  // Verifica autenticação
  if (!user) {
    return { allowed: false, reason: "Usuário não autenticado" };
  }

  // Verifica se usuário está bloqueado
  if (user.blocked) {
    return { allowed: false, reason: "Sua conta foi bloqueada" };
  }

  // Verifica permissão geral
  if (!hasPermission(user, action, resource)) {
    return {
      allowed: false,
      reason: `Sem permissão para ${action} ${resource}`,
    };
  }

  // Se é delete ou update, e não é admin, valida proprietário
  if ((action === "delete" || action === "update") && resourceOwnerId) {
    if (!isResourceOwner(user, resourceOwnerId)) {
      return {
        allowed: false,
        reason: "Você pode apenas modificar seus próprios registros",
      };
    }
  }

  return { allowed: true, reason: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDITORIA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log seguro de ações sensíveis
 * @param {string} action - Ação realizada
 * @param {object} user - Usuário que realizou a ação
 * @param {string} resource - Recurso afetado
 * @param {string} resourceId - ID do recurso
 * @param {any} details - Detalhes adicionais
 */
export function logSecurityEvent(action, user, resource, resourceId, details) {
  const timestamp = new Date().toISOString();
  const event = {
    timestamp,
    action,
    userId: user?.id,
    userPhone: user?.phone,
    userRole: user?.role,
    resource,
    resourceId,
    details: typeof details === "string" ? details : JSON.stringify(details),
  };

  // Envia para logging system (implementar com seu logger)
  console.log("🔐 SECURITY EVENT:", event);

  // TODO: Enviar para Supabase audit_logs ou serviço de logging externo
  return event;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROTEÇÃO CONTRA ATAQUES COMUNS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica if request está tentando acessar múltiplos usuários (enum attack)
 * @param {array} userIds - Array de IDs de usuários a acessar
 * @param {object} user - Usuário autenticado
 * @param {number} threshold - Limite de tentativas (default 10)
 * @returns {boolean}
 */
export function detectEnumeration(userIds, user, threshold = 10) {
  if (user?.role === ROLES.ADMIN) return false;
  if (!Array.isArray(userIds)) return false;

  const uniqueIds = new Set(userIds);
  return uniqueIds.size >= threshold;
}

export default {
  hasRole,
  hasAnyRole,
  hasPermission,
  isResourceOwner,
  filterSensitiveFields,
  filterSensitiveFieldsArray,
  validateOperation,
  logSecurityEvent,
  detectEnumeration,
};
