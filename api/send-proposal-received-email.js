/**
 * Endpoint: POST /api/send-proposal-received-email
 * Envia email de proposta recebida para o gestor
 *
 * Body:
 * {
 *   managerEmail: string,
 *   managerName: string,
 *   proposalData: { vendorName, productName, price, unit, quantity }
 * }
 */

import { sendProposalReceivedEmailToManager } from "../src/lib/email-service.js";

export default async function handler(req, res) {
  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { managerEmail, managerName, proposalData } = req.body || {};

    if (!managerEmail || !managerName || !proposalData) {
      return res.status(400).json({
        error: "Campos obrigatórios: managerEmail, managerName, proposalData",
      });
    }

    const result = await sendProposalReceivedEmailToManager(
      managerEmail,
      managerName,
      proposalData,
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        messageId: result.messageId,
        message: "Email de proposta recebida enviado com sucesso",
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Erro ao enviar email",
      });
    }
  } catch (error) {
    console.error("[send-proposal-received-email] erro fatal:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro interno do servidor",
    });
  }
}
