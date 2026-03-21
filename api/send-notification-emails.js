/**
 * Email Notification Endpoints
 * - POST /api/send-order-email → Novo pedido para gestor
 * - POST /api/send-proposal-email → Nova proposta para fornecedor
 * - POST /api/send-proposal-received-email → Proposta recebida para gestor
 */

import {
  sendNewOrderEmailToManager,
  sendNewProposalEmailToVendor,
  sendProposalReceivedEmailToManager,
} from "../src/lib/email-service.js";

/**
 * POST /api/send-order-email
 * Body: { managerEmail, managerName, orderData: { productName, quantity, unit, producerName, producerPhone, date, campaignLink } }
 */
export async function handleSendOrderEmail(req, res) {
  // CORS
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    return res.sendStatus(200);
  }

  try {
    const { managerEmail, managerName, orderData } = req.body;

    if (!managerEmail || !managerName || !orderData) {
      return res.status(400).json({
        error: "Missing required fields: managerEmail, managerName, orderData",
      });
    }

    const result = await sendNewOrderEmailToManager(managerEmail, managerName, orderData);

    if (result.success) {
      return res.json({
        success: true,
        messageId: result.messageId,
        message: "Email de novo pedido enviado",
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Falha ao enviar email",
      });
    }
  } catch (error) {
    console.error("[send-order-email] error:", error);
    return res.status(500).json({
      error: error.message || "Erro ao enviar email",
    });
  }
}

/**
 * POST /api/send-proposal-email
 * Body: { vendorEmail, vendorName, proposalData: { productName, quantity, unit, deadline, campaignName, campaignLink } }
 */
export async function handleSendProposalEmail(req, res) {
  // CORS
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    return res.sendStatus(200);
  }

  try {
    const { vendorEmail, vendorName, proposalData } = req.body;

    if (!vendorEmail || !vendorName || !proposalData) {
      return res.status(400).json({
        error: "Missing required fields: vendorEmail, vendorName, proposalData",
      });
    }

    const result = await sendNewProposalEmailToVendor(vendorEmail, vendorName, proposalData);

    if (result.success) {
      return res.json({
        success: true,
        messageId: result.messageId,
        message: "Email de nova proposta enviado",
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Falha ao enviar email",
      });
    }
  } catch (error) {
    console.error("[send-proposal-email] error:", error);
    return res.status(500).json({
      error: error.message || "Erro ao enviar email",
    });
  }
}

/**
 * POST /api/send-proposal-received-email
 * Body: { managerEmail, managerName, proposalData: { vendorName, productName, quantity, unit, pricePerUnit, deliveryDate, campaignLink } }
 */
export async function handleSendProposalReceivedEmail(req, res) {
  // CORS
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    return res.sendStatus(200);
  }

  try {
    const { managerEmail, managerName, proposalData } = req.body;

    if (!managerEmail || !managerName || !proposalData) {
      return res.status(400).json({
        error: "Missing required fields: managerEmail, managerName, proposalData",
      });
    }

    const result = await sendProposalReceivedEmailToManager(managerEmail, managerName, proposalData);

    if (result.success) {
      return res.json({
        success: true,
        messageId: result.messageId,
        message: "Email de proposta recebida enviado",
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Falha ao enviar email",
      });
    }
  } catch (error) {
    console.error("[send-proposal-received-email] error:", error);
    return res.status(500).json({
      error: error.message || "Erro ao enviar email",
    });
  }
}

export default handleSendOrderEmail;
