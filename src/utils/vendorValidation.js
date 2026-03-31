/**
 * 📋 Validação de Perfil do Vendedor
 * Define quais campos são obrigatórios e valida completude do perfil
 */

/**
 * Lista de campos obrigatórios para que o vendedor possa enviar propostas
 */
export const VENDOR_REQUIRED_FIELDS = {
  name: {
    label: "Nome da empresa",
    priority: 1,
  },
  phone: {
    label: "WhatsApp",
    priority: 2,
  },
  city: {
    label: "Cidade",
    priority: 3,
  },
  notes: {
    label: "Produtos que você fornece",
    priority: 4,
  },
};

/**
 * Verifica se um vendedor tem o perfil completo
 * @param {Object} vendor - Objeto do vendedor
 * @returns {Object} { isComplete: boolean, missingFields: string[] }
 */
export function validateVendorProfile(vendor) {
  const missingFields = [];

  if (!vendor) {
    // Se não existe vendor, todos os campos estão faltando
    return {
      isComplete: false,
      missingFields: Object.entries(VENDOR_REQUIRED_FIELDS)
        .sort((a, b) => a[1].priority - b[1].priority)
        .map(([_, field]) => field.label),
    };
  }

  // Verifica cada campo obrigatório
  Object.entries(VENDOR_REQUIRED_FIELDS).forEach(([key, field]) => {
    const value = vendor[key];
    const isEmpty = !value || (typeof value === "string" && !value.trim());
    if (isEmpty) {
      missingFields.push(field.label);
    }
  });

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Retorna mensagem de erro formatada com campos faltantes
 */
export function getProfileErrorMessage(vendor) {
  const { isComplete, missingFields } = validateVendorProfile(vendor);

  if (isComplete) {
    return null;
  }

  if (missingFields.length === 0) {
    return "Complete seu perfil para enviar propostas.";
  }

  const fields = missingFields.join(", ");
  return `Perfil incompleto. Preencha: ${fields}`;
}

/**
 * Checa se pode enviar proposta
 */
export function canSendProposal(vendor) {
  return validateVendorProfile(vendor).isComplete;
}
