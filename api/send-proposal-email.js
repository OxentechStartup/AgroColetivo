/**
 * Endpoint: POST /api/send-proposal-email
 * Envia email de nova proposta para o fornecedor via n8n
 *
 * Body:
 * {
 *   vendorEmail: string,
 *   vendorName: string,
 *   proposalData: { productName, quantity, unit, deadline, campaignName, campaignLink }
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

function validateProposalInput(vendorEmail, vendorName, proposalData) {
  const errors = [];

  if (!vendorEmail || typeof vendorEmail !== "string") {
    errors.push("Email do fornecedor é obrigatório");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorEmail)) {
    errors.push("Email do fornecedor inválido");
  }

  if (!vendorName || typeof vendorName !== "string") {
    errors.push("Nome do fornecedor é obrigatório");
  }

  if (!proposalData || typeof proposalData !== "object") {
    errors.push("Dados da proposta são obrigatórios");
  } else {
    const requiredFields = [
      "productName",
      "quantity",
      "unit",
      "deadline",
      "campaignName",
    ];
    requiredFields.forEach((field) => {
      if (!proposalData[field]) errors.push(`Campo obrigatório: ${field}`);
    });
  }

  return { valid: errors.length === 0, errors };
}

function createProposalEmailBody(proposalData, vendorName) {
  const {
    productName,
    quantity,
    unit,
    deadline,
    deadlineRaw,
    campaignName,
    campaignLink,
  } = proposalData;

  const parsedDeadline = deadlineRaw ? new Date(deadlineRaw) : null;
  const deadlineDate =
    parsedDeadline && !Number.isNaN(parsedDeadline.getTime())
      ? parsedDeadline.toLocaleDateString("pt-BR")
      : deadline;
  const deadlineTime =
    parsedDeadline && !Number.isNaN(parsedDeadline.getTime())
      ? parsedDeadline.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; }
    .header { text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #f59e0b; font-size: 28px; margin: 0; }
    .section { background: #fffbeb; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #f59e0b; }
    .info-row { margin: 12px 0; color: #374151; }
    .label { font-weight: 600; color: #1f2937; }
    .value { color: #6b7280; }
    .deadline { background: #fee2e2; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #dc2626; }
    .cta { text-align: center; margin-top: 24px; }
    .button { background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💼 Nova Proposta Disponível</h1>
      <p style="color:#666;margin:8px 0 0">HubCompras</p>
    </div>

    <p>Olá <strong>${vendorName}</strong>,</p>
    <p>Uma nova proposta foi criada e está aguardando suas ofertas!</p>

    <div class="section">
      <h3 style="margin-top:0;color:#f59e0b;">Campanha: ${campaignName}</h3>
      <div class="info-row">
        <span class="label">Produto:</span>
        <span class="value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="label">Quantidade:</span>
        <span class="value">${quantity} ${unit}</span>
      </div>
    </div>

    <div class="deadline">
      <strong>⏰ Prazo para enviar proposta:</strong>
       <p style="margin:8px 0 0;color:#dc2626;font-weight:600;">${deadlineDate}${deadlineTime ? ` às ${deadlineTime}` : ""}</p>
    </div>

    ${
      campaignLink
        ? `
    <div class="cta">
      <a href="${campaignLink}" class="button">Ver Detalhes da Campanha</a>
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

    const { vendorEmail, vendorName, proposalData } = req.body || {};

    const validation = validateProposalInput(vendorEmail, vendorName, proposalData);
    if (!validation.valid) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: validation.errors,
      });
    }

    const cleanEmail = sanitizeString(vendorEmail.toLowerCase());
    const cleanName = sanitizeString(vendorName);

    const rateCheck = checkRateLimit(getClientIp(req), cleanEmail);
    if (!rateCheck.allowed) {
      res.setHeader("Retry-After", rateCheck.retryAfter);
      return res.status(429).json({
        error: "Muitas requisições. Tente novamente mais tarde.",
        retryAfter: rateCheck.retryAfter,
      });
    }

    const campaignLink =
      proposalData.campaignLink &&
      /^https?:\/\//i.test(String(proposalData.campaignLink || ""))
        ? sanitizeString(String(proposalData.campaignLink))
        : "";

    const cleanProposalData = {
      productName: sanitizeString(String(proposalData.productName || "")),
      quantity: sanitizeString(String(proposalData.quantity || "")),
      unit: sanitizeString(String(proposalData.unit || "")),
      deadline: sanitizeString(String(proposalData.deadline || "")),
      deadlineRaw: proposalData.deadline || "",
      campaignName: sanitizeString(String(proposalData.campaignName || "")),
      campaignLink,
    };

    const emailBody = createProposalEmailBody(cleanProposalData, cleanName);

    const result = await sendEmail({
      to: cleanEmail,
      subject: `💼 Nova Proposta: ${cleanProposalData.campaignName}`,
      body: emailBody,
    });

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
      message: "Email de nova proposta enviado com sucesso",
      service: result.service,
    });
  } catch (error) {
    console.error("[send-proposal-email] erro fatal:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro interno do servidor",
    });
  }
}
