/**
 * Endpoint: POST /api/send-proposal-received-email
 * Envia email de proposta recebida para o gestor via n8n
 *
 * Body:
 * {
 *   managerEmail: string,
 *   managerName: string,
 *   proposalData: { vendorName, productName, price, unit, quantity }
 * }
 */

import { sendEmail } from "../src/lib/n8n-service.js";
import { getClientIp, sanitizeString, checkRateLimit } from "../src/lib/email-security.js";

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
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

function validateProposalReceivedInput(managerEmail, managerName, proposalData) {
  const errors = [];

  if (!managerEmail || typeof managerEmail !== "string") {
    errors.push("Email do gestor é obrigatório");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) {
    errors.push("Email do gestor inválido");
  }

  if (!managerName || typeof managerName !== "string") {
    errors.push("Nome do gestor é obrigatório");
  }

  if (!proposalData || typeof proposalData !== "object") {
    errors.push("Dados da proposta são obrigatórios");
  } else {
    const requiredFields = ["vendorName", "productName", "price", "unit", "quantity"];
    requiredFields.forEach((field) => {
      if (!proposalData[field]) errors.push(`Campo obrigatório: ${field}`);
    });
  }

  return { valid: errors.length === 0, errors };
}

function createProposalReceivedEmailBody(proposalData, managerName) {
  const { vendorName, productName, price, unit, quantity } = proposalData;
  const pricePerUnit =
    price && quantity
      ? (parseFloat(price) / parseFloat(quantity)).toFixed(2)
      : price;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; }
    .header { text-align: center; border-bottom: 2px solid #1d6ec9; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1d6ec9; font-size: 28px; margin: 0; }
    .section { background: #eff6ff; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #1d6ec9; }
    .vendor-box { background: #eff6ff; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #1d6ec9; }
    .info-row { margin: 12px 0; color: #374151; }
    .label { font-weight: 600; color: #1f2937; }
    .value { color: #6b7280; }
    .price-highlight { background: #fef3c7; padding: 12px; border-radius: 6px; margin: 12px 0; border-left: 4px solid #f59e0b; }
    .price-value { font-size: 24px; font-weight: 700; color: #b45309; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Proposta Recebida</h1>
      <p style="color:#666;margin:8px 0 0">HubCompras</p>
    </div>

    <p>Olá <strong>${managerName}</strong>,</p>
    <p>Uma nova proposta foi recebida de um fornecedor!</p>

    <div class="vendor-box">
      <h3 style="margin-top:0;color:#1d6ec9;">📋 Fornecedor</h3>
      <p style="margin:12px 0;font-size:18px;font-weight:600;color:#1558b0;">${vendorName}</p>
    </div>

    <div class="section">
      <h3 style="margin-top:0;color:#1d6ec9;">Detalhes da Oferta</h3>
      <div class="info-row">
        <span class="label">Produto:</span>
        <span class="value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="label">Quantidade:</span>
        <span class="value">${quantity} ${unit}</span>
      </div>
    </div>

    <div class="price-highlight">
      <div style="color:#999;font-size:14px;">Preço Total</div>
      <div class="price-value">R$ ${parseFloat(price || 0).toFixed(2)}</div>
      ${pricePerUnit ? `<div style="color:#999;font-size:13px;">R$ ${pricePerUnit} por ${unit}</div>` : ""}
    </div>

    <div class="footer">
      <p>© 2026 HubCompras · Oxentech Software</p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  try {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { managerEmail, managerName, proposalData } = req.body || {};

    const validation = validateProposalReceivedInput(
      managerEmail,
      managerName,
      proposalData,
    );
    if (!validation.valid) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: validation.errors,
      });
    }

    const cleanEmail = sanitizeString(managerEmail.toLowerCase());
    const cleanName = sanitizeString(managerName);

    const rateCheck = checkRateLimit(getClientIp(req), cleanEmail);
    if (!rateCheck.allowed) {
      res.setHeader("Retry-After", rateCheck.retryAfter);
      return res.status(429).json({
        error: "Muitas requisições. Tente novamente mais tarde.",
        retryAfter: rateCheck.retryAfter,
      });
    }

    const cleanProposalData = {
      vendorName: sanitizeString(String(proposalData.vendorName || "")),
      productName: sanitizeString(String(proposalData.productName || "")),
      price: sanitizeString(String(proposalData.price || "")),
      unit: sanitizeString(String(proposalData.unit || "")),
      quantity: sanitizeString(String(proposalData.quantity || "")),
    };

    const emailBody = createProposalReceivedEmailBody(
      cleanProposalData,
      cleanName,
    );

    const result = await sendEmail({
      to: cleanEmail,
      subject: `✅ Proposta Recebida de ${cleanProposalData.vendorName}`,
      body: emailBody,
    });

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
      message: "Email de proposta recebida enviado com sucesso",
      service: result.service,
    });
  } catch (error) {
    console.error("[send-proposal-received-email] erro fatal:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro interno do servidor",
    });
  }
}
