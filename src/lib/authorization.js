/**
 * Middleware de Autorização e Controle de Acesso
 */

import { ROLES } from "../constants/roles.js";
import { supabase } from "./supabase.js";

// ═══════════════════════════════════════════════════════════════════════════
// AUTORIZAÇÃO BASEADA EM ROLE
// ═══════════════════════════════════════════════════════════════════════════

export function hasRole(user, requiredRole) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  return user.role === requiredRole;
}

export function hasAnyRole(user, roles) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  return roles.includes(user.role);
}

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
      vendors: ["create", "read", "update"],
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

export function isResourceOwner(user, resourceUserId) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  return user.id === resourceUserId;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROTEÇÃO DE DADOS SENSÍVEIS
// ═══════════════════════════════════════════════════════════════════════════

export function filterSensitiveFields(data, user) {
  if (!data) return data;
  const alwaysSensitive = ["password_hash", "password", "secret", "token"];
  const filtered = { ...data };
  alwaysSensitive.forEach((field) => {
    delete filtered[field];
  });
  if (user?.role !== ROLES.ADMIN) {
    delete filtered.fee_paid_by;
  }
  return filtered;
}

export function filterSensitiveFieldsArray(array, user) {
  if (!Array.isArray(array)) return array;
  return array.map((item) => filterSensitiveFields(item, user));
}

export function validateOperation(user, action, resource, resourceOwnerId) {
  if (!user) return { allowed: false, reason: "Usuário não autenticado" };
  if (user.blocked)
    return { allowed: false, reason: "Sua conta foi bloqueada" };
  if (!hasPermission(user, action, resource)) {
    return {
      allowed: false,
      reason: `Sem permissão para ${action} ${resource}`,
    };
  }
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
// AUDITORIA — persiste no banco via RPC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registra evento de segurança no banco (audit_logs).
 * Chama a função SQL log_security_event via supabase.rpc.
 * Nunca lança erro — falha silenciosamente para não interromper o fluxo.
 */
export async function logSecurityEvent(
  action,
  user,
  resource,
  resourceId,
  details,
) {
  const payload = {
    p_action: action,
    p_user_id: user?.id ?? null,
    p_user_phone: user?.phone ?? null,
    p_user_role: user?.role ?? null,
    p_resource: resource ?? null,
    p_resource_id: resourceId != null ? String(resourceId) : null,
    p_details:
      typeof details === "string" ? details : JSON.stringify(details ?? null),
    p_ip_hint: null, // IP não disponível no browser sem backend próprio
  };

  try {
    const { error } = await supabase.rpc("log_security_event", payload);
    if (error) {
      // Loga localmente apenas em desenvolvimento para não expor detalhes em prod
      if (import.meta.env.DEV) {
        console.warn(
          "[audit] Falha ao persistir evento:",
          error?.message || "unknown",
        );
      }
    }
  } catch {
    // Ignora erros de rede — auditoria nunca deve bloquear o fluxo principal
  }

  // Mantém log local SANITIZADO em desenvolvimento para facilitar debug
  // NÃO faz log de dados sensíveis (email, phone, IDs de usuário, URLs de API)
  if (import.meta.env.DEV) {
    const sanitized = {
      action: payload.p_action,
      resource: payload.p_resource,
      timestamp: new Date().toISOString(),
    };
    console.log("[security]", sanitized);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROTEÇÃO CONTRA ATAQUES COMUNS
// ═══════════════════════════════════════════════════════════════════════════

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
