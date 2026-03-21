/**
 * Endpoint: POST /api/send-proposal-email
 * Envia email de nova proposta para o fornecedor
 *
 * Body:
 * {
 *   vendorEmail: string,
 *   vendorName: string,
 *   proposalData: { productName, quantity, unit, deadline, campaignName, campaignLink }
 * }
 */

import { sendNewProposalEmailToVendor } from "../src/lib/email-service.js";

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

    const { vendorEmail, vendorName, proposalData } = req.body || {};

    if (!vendorEmail || !vendorName || !proposalData) {
      return res.status(400).json({
        error: "Campos obrigatórios: vendorEmail, vendorName, proposalData",
      });
    }

    const result = await sendNewProposalEmailToVendor(
      vendorEmail,
      vendorName,
      proposalData,
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        messageId: result.messageId,
        message: "Email de nova proposta enviado com sucesso",
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Erro ao enviar email",
      });
    }
  } catch (error) {
    console.error("[send-proposal-email] erro fatal:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro interno do servidor",
    });
  }
}
