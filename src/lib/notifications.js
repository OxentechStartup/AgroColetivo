/**
 * Notification Email Service — Frontend
 *
 * Chama os endpoints de email do servidor para notificações
 * - Novo pedido → Gestor
 * - Nova proposta → Fornecedor
 * - Proposta recebida → Gestor
 */

// ✅ Detecta automaticamente: usa relative URLs em qualquer ambiente
// Em dev (localhost): chamadas locais funcionam normalmente
// Em produção (Render): /api funciona pelo mesmo servidor
const API_BASE_URL = ""; // URL relativa = mesmo origin

async function sendEmailViaAPI(endpoint, payload) {
  try {
    const url = `${API_BASE_URL}/api/${endpoint}`;
    console.log(`📡 Fazendo requisição para: ${url}`, payload);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log(
      `📡 Resposta do servidor (${endpoint}):`,
      response.status,
      response.statusText,
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Resposta bem-sucedida:`, data);
      return { success: true, ...data };
    } else {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error || `Servidor retornou ${response.status}`;
      console.error(`❌ Erro na resposta:`, errMsg);
      throw new Error(errMsg);
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar email para ${endpoint}:`, error?.message);
    return {
      success: false,
      error: error?.message,
      fallback: "Email será processado em breve",
    };
  }
}

/**
 * Enviar email de novo pedido para o gestor
 */
export async function notifyManagerNewOrder(
  managerEmail,
  managerName,
  orderData,
) {
  return sendEmailViaAPI("send-order-email", {
    managerEmail,
    managerName,
    orderData,
  });
}

/**
 * Enviar email de nova proposta para o fornecedor
 */
export async function notifyVendorNewProposal(
  vendorEmail,
  vendorName,
  proposalData,
) {
  return sendEmailViaAPI("send-proposal-email", {
    vendorEmail,
    vendorName,
    proposalData,
  });
}

/**
 * Enviar email de proposta recebida para o gestor
 */
export async function notifyManagerProposalReceived(
  managerEmail,
  managerName,
  proposalData,
) {
  return sendEmailViaAPI("send-proposal-received-email", {
    managerEmail,
    managerName,
    proposalData,
  });
}

export default {
  notifyManagerNewOrder,
  notifyVendorNewProposal,
  notifyManagerProposalReceived,
};
