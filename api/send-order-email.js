/**
 * Endpoint: POST /api/send-order-email
 * Envia email de novo pedido para o gestor via n8n
 *
 * Body:
 * {
 *   managerEmail: string,
 *   managerName: string,
 *   orderData: { productName, quantity, unit, producerName, producerPhone, date, campaignLink }
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

function validateOrderInput(managerEmail, managerName, orderData) {
  const errors = [];

  if (!managerEmail || typeof managerEmail !== "string") {
    errors.push("Email do gestor é obrigatório");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) {
    errors.push("Email do gestor inválido");
  }

  if (!managerName || typeof managerName !== "string") {
    errors.push("Nome do gestor é obrigatório");
  }

  if (!orderData || typeof orderData !== "object") {
    errors.push("Dados do pedido são obrigatórios");
  } else {
    const requiredFields = [
      "productName",
      "quantity",
      "unit",
      "producerName",
      "producerPhone",
      "date",
    ];
    requiredFields.forEach((field) => {
      if (!orderData[field]) errors.push(`Campo obrigatório: ${field}`);
    });
  }

  return { valid: errors.length === 0, errors };
}

function createOrderEmailBody(orderData, managerName) {
  const {
    productName,
    quantity,
    unit,
    producerName,
    producerPhone,
    date,
    dateRaw,
    campaignLink,
  } = orderData;

  const parsedDate = dateRaw ? new Date(dateRaw) : null;
  const dateLabel = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString("pt-BR")
    : date;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; }
    .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #10b981; font-size: 28px; margin: 0; }
    .section { background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #10b981; }
    .product-info { background: #e8f5e9; padding: 16px; border-radius: 6px; margin: 20px 0; }
    .info-row { margin: 12px 0; color: #374151; }
    .label { font-weight: 600; color: #1f2937; }
    .value { color: #6b7280; }
    .cta { text-align: center; margin-top: 24px; }
    .button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Novo Pedido Recebido</h1>
      <p style="color:#666;margin:8px 0 0">HubCompras</p>
    </div>

    <p>Olá <strong>${managerName}</strong>,</p>
    <p>Um novo pedido foi registrado no sistema!</p>

    <div class="section">
      <h3 style="margin-top:0;color:#10b981;">Detalhes do Pedido</h3>
      <div class="info-row">
        <span class="label">Produto:</span>
        <span class="value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="label">Quantidade:</span>
        <span class="value">${quantity} ${unit}</span>
      </div>
      <div class="info-row">
        <span class="label">Data:</span>
        <span class="value">${dateLabel}</span>
      </div>
    </div>

    <div class="section">
      <h3 style="margin-top:0;color:#10b981;">Produtor</h3>
      <div class="info-row">
        <span class="label">Nome:</span>
        <span class="value">${producerName}</span>
      </div>
      <div class="info-row">
        <span class="label">Telefone:</span>
        <span class="value">${producerPhone}</span>
      </div>
    </div>

    ${
      campaignLink
        ? `
    <div class="cta">
      <a href="${campaignLink}" class="button">Ver Campanha Completa</a>
    </div>
    `
        : ""
    }

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

    const { managerEmail, managerName, orderData } = req.body || {};

    const validation = validateOrderInput(managerEmail, managerName, orderData);
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

    const campaignLink =
      orderData.campaignLink &&
      /^https?:\/\//i.test(String(orderData.campaignLink || ""))
        ? sanitizeString(String(orderData.campaignLink))
        : "";

    const cleanOrderData = {
      productName: sanitizeString(String(orderData.productName || "")),
      quantity: sanitizeString(String(orderData.quantity || "")),
      unit: sanitizeString(String(orderData.unit || "")),
      producerName: sanitizeString(String(orderData.producerName || "")),
      producerPhone: sanitizeString(String(orderData.producerPhone || "")),
      date: sanitizeString(String(orderData.date || "")),
      dateRaw: orderData.date || "",
      campaignLink,
    };

    const emailBody = createOrderEmailBody(cleanOrderData, cleanName);

    const result = await sendEmail({
      to: cleanEmail,
      subject: `📦 Novo Pedido: ${cleanOrderData.productName}`,
      body: emailBody,
    });

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
      message: "Email de novo pedido enviado com sucesso",
      service: result.service,
    });
  } catch (error) {
    console.error("[send-order-email] erro fatal:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao enviar email",
    });
  }
}
