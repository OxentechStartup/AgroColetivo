/**
 * Email Notification Endpoints (Deprecated)
 *
 * Use os endpoints individuais:
 * - POST /api/send-order-email → Novo pedido para gestor
 * - POST /api/send-proposal-email → Nova proposta para fornecedor
 * - POST /api/send-proposal-received-email → Proposta recebida para gestor
 *
 * Este arquivo é mantido apenas para compatibilidade backward.
 */

import { sendEmail } from "../src/lib/n8n-service.js";

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "https://agro-coletivo.vercel.app",
  "https://agrocoletivo.onrender.com",
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

function applyCors(req, res) {
  const origin =
    req.headers.origin ||
    (req.headers.referer
      ? req.headers.referer.split("/").slice(0, 3).join("/")
      : null);

  if (origin && allowedOrigins.some((allowed) => origin.includes(allowed))) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");
}

/**
 * POST /api/send-order-email
 * Body: { managerEmail, managerName, orderData: { productName, quantity, unit, producerName, producerPhone, date, campaignLink } }
 */
export async function handleSendOrderEmail(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  try {
    const { managerEmail, managerName, orderData } = req.body;

    if (!managerEmail || !managerName || !orderData) {
      return res.status(400).json({
        error: "Missing required fields: managerEmail, managerName, orderData",
      });
    }

    // Usar n8n service para enviar email
    const result = await sendEmail({
      to: managerEmail,
      subject: `📦 Novo Pedido: ${orderData.productName}`,
      body: `Novo pedido recebido de ${orderData.producerName} para ${orderData.productName} - ${orderData.quantity} ${orderData.unit}`,
    });

    return res.json({
      success: true,
      messageId: result.messageId,
      message: "Email de novo pedido enviado",
      service: result.service,
    });
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
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  try {
    const { vendorEmail, vendorName, proposalData } = req.body;

    if (!vendorEmail || !vendorName || !proposalData) {
      return res.status(400).json({
        error: "Missing required fields: vendorEmail, vendorName, proposalData",
      });
    }

    // Usar n8n service para enviar email
    const result = await sendEmail({
      to: vendorEmail,
      subject: `💼 Nova Proposta: ${proposalData.campaignName}`,
      body: `Nova proposta para ${proposalData.productName} - ${proposalData.quantity} ${proposalData.unit}`,
    });

    return res.json({
      success: true,
      messageId: result.messageId,
      message: "Email de nova proposta enviado",
      service: result.service,
    });
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
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  try {
    const { managerEmail, managerName, proposalData } = req.body;

    if (!managerEmail || !managerName || !proposalData) {
      return res.status(400).json({
        error:
          "Missing required fields: managerEmail, managerName, proposalData",
      });
    }

    // Usar n8n service para enviar email
    const result = await sendEmail({
      to: managerEmail,
      subject: `✅ Proposta Recebida de ${proposalData.vendorName}`,
      body: `Proposta recebida de ${proposalData.vendorName} para ${proposalData.productName}`,
    });

    return res.json({
      success: true,
      messageId: result.messageId,
      message: "Email de proposta recebida enviado",
      service: result.service,
    });
  } catch (error) {
    console.error("[send-proposal-received-email] error:", error);
    return res.status(500).json({
      error: error.message || "Erro ao enviar email",
    });
  }
}

export default handleSendOrderEmail;
