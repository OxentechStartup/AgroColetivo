// ─────────────────────────────────────────────────────────────────────────────
// Constantes de papéis/roles do sistema
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  GESTOR: "pivo", // Gestor de compras coletivas (pivô)
  VENDOR: "vendor", // Fornecedor
  BUYER: "buyer", // Comprador/Produtor
  ADMIN: "admin", // Administrador
};

export const ROLE_LABELS = {
  [ROLES.GESTOR]: "Gestor",
  [ROLES.VENDOR]: "Fornecedor",
  [ROLES.BUYER]: "Comprador",
  [ROLES.ADMIN]: "Administrador",
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.GESTOR]: "Coordena compras coletivas",
  [ROLES.VENDOR]: "Fornecedor de produtos",
  [ROLES.BUYER]: "Comprador/Produtor",
  [ROLES.ADMIN]: "Administrador do sistema",
};

export const isGestor = (role) => role === ROLES.GESTOR || role === ROLES.ADMIN;
export const isVendor = (role) => role === ROLES.VENDOR;
export const isAdmin = (role) => role === ROLES.ADMIN;
