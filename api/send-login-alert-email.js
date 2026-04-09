/**
 * Login Alert Email Endpoint — /api/send-login-alert-email
 *
 * Envia aviso para o email do usuário após login bem-sucedido.
 * Não bloqueia o fluxo de autenticação quando falha.
 */

import { sendLoginAlertEmail as sendViaWebhook } from "../src/lib/n8n-service.js";
import nodemailer from "nodemailer";
import {
  getClientIp,
  sanitizeString,
  checkRateLimit,
  logEmailAttempt,
  updateEmailLogStatus,
} from "../src/lib/email-security.js";

function validateLoginAlertInput(email, name, details) {
  const errors = [];

  if (!email || typeof email !== "string") {
    errors.push("Email é obrigatório");
  } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push("Email inválido");
  }

  if (name !== undefined && typeof name !== "string") {
    errors.push("Nome inválido");
  }

  if (details !== undefined && typeof details !== "object") {
    errors.push("Detalhes inválidos");
  }

  return { valid: errors.length === 0, errors };
}

const htmlBody = (name, details) => {
  const when = details?.timestamp
    ? new Date(details.timestamp).toLocaleString("pt-BR")
    : new Date().toLocaleString("pt-BR");

  const device = details?.platform || "Dispositivo não identificado";
  const browser = details?.userAgent || "Navegador não identificado";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; }
    .header { text-align: center; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { color: #059669; font-size: 26px; margin: 0; }
    .info { background: #f9fafb; border-left: 4px solid #059669; padding: 14px; border-radius: 6px; margin: 16px 0; }
    .muted { color: #6b7280; font-size: 13px; }
    .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 14px; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Aviso de Login</h1>
      <p class="muted">HubCompras</p>
    </div>

    <p>Olá <strong>${name}</strong>,</p>
    <p>Detectamos um novo acesso à sua conta.</p>

    <div class="info">
      <p><strong>Data e hora:</strong> ${when}</p>
      <p><strong>Dispositivo:</strong> ${device}</p>
      <p><strong>Navegador:</strong> ${browser}</p>
    </div>

    <div class="warning">
      <strong>Não foi você?</strong>
      <p style="margin: 8px 0 0;">Recomendamos alterar sua senha imediatamente para proteger sua conta.</p>
    </div>

    <div class="footer">
      <p>© 2026 HubCompras · Oxentech Software</p>
    </div>
  </div>
</body>
</html>`;
};

async function sendViaGmail(email, name, details) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

  if (!gmailUser || !gmailPassword) {
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      connectionTimeout: 5000,
      socketTimeout: 5000,
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    const sendPromise = transporter.sendMail({
      from: `"HubCompras" <${gmailUser}>`,
      to: email,
      subject: "🔐 Novo login na sua conta - HubCompras",
      html: htmlBody(name, details),
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gmail timeout")), 10000),
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);
    return { success: true, messageId: info.messageId, service: "gmail" };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://agro-coletivo.vercel.app",
      "https://agrocoletivo.onrender.com",
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    ].filter(Boolean);

    const origin = req.headers.origin || req.headers.referer?.split("/")[2];
    if (origin && allowedOrigins.some((a) => origin.includes(a))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { email, name, details } = req.body || {};

    const validation = validateLoginAlertInput(email, name, details);
    if (!validation.valid) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: validation.errors });
    }

    const cleanEmail = sanitizeString(email.toLowerCase());
    const cleanName = sanitizeString(name || "Usuário");
    const cleanDetails = {
      timestamp: sanitizeString(details?.timestamp || new Date().toISOString()),
      userAgent: sanitizeString(details?.userAgent || "Desconhecido"),
      platform: sanitizeString(details?.platform || "Desconhecido"),
      language: sanitizeString(details?.language || "Desconhecido"),
    };

    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(clientIp, cleanEmail);
    if (!rateCheck.allowed) {
      res.setHeader("Retry-After", rateCheck.retryAfter);
      return res.status(429).json({
        error: "Muitas requisições. Tente novamente mais tarde.",
        retryAfter: rateCheck.retryAfter,
      });
    }

    try {
      await logEmailAttempt(
        "login_alert",
        cleanEmail,
        cleanName,
        "🔐 Novo login na sua conta - HubCompras",
        "pending",
      );
    } catch {
      // Ignore falha de auditoria
    }

    let sent = null;

    // Tentar N8N primeiro
    console.log("🔄 Tentando N8N Webhook para aviso de login...");
    try {
      sent = await sendViaWebhook(cleanEmail, cleanName, cleanDetails);
      if (sent?.success) {
        console.log("✅ N8N webhook sucesso!");
      }
    } catch (error) {
      console.log(`❌ N8N falhou: ${error.message}`);
    }

    // Fallback para Gmail
    if (!sent) {
      console.log("🔄 Tentando Gmail SMTP...");
      sent = await sendViaGmail(cleanEmail, cleanName, cleanDetails);
    }

    if (sent?.success) {
      try {
        await updateEmailLogStatus(
          cleanEmail,
          "sent",
          sent.service,
          sent.messageId,
        );
      } catch {
        // Ignore falha de log
      }

      return res.status(200).json({
        success: true,
        message: "Email de aviso de login enviado com sucesso",
        service: sent.service,
        messageId: sent.messageId,
      });
    }

    try {
      await updateEmailLogStatus(
        cleanEmail,
        "pending",
        "fallback",
        null,
        "Gmail indisponível",
      );
    } catch {
      // Ignore falha de log
    }

    return res.status(200).json({
      success: true,
      message: "Login concluído sem envio do aviso por email",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Erro ao enviar aviso de login"
          : error.message,
    });
  }
}
