/**
 * Email Verification Endpoint — /api/send-verification-email
 *
 * Defesas de segurança:
 * ✅ Rate limiting (3 tentativas por email em 24h)
 * ✅ Validação de entrada
 * ✅ Auditoria em banco de dados
 * ✅ CORS restritivo
 * ✅ Timeout em envios
 *
 * Estratégia de envio (prioridade):
 * 1. N8N Webhook (principal)
 * 2. SendGrid (fallback)
 * 3. Gmail SMTP (fallback)
 */

import { sendVerificationEmail as sendViaWebhook } from "../src/lib/n8n-service.js";
import nodemailer from "nodemailer";
import {
  getClientIp,
  validateEmailInput,
  sanitizeString,
  checkRateLimit,
  logEmailAttempt,
  updateEmailLogStatus,
} from "../src/lib/email-security.js";

const isDev = process.env.NODE_ENV !== "production";
const debugLog = (...args) => {
  if (isDev) console.log(...args);
};
const debugWarn = (...args) => {
  if (isDev) console.warn(...args);
};

const htmlBody = (code, name) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #059669; font-size: 28px; margin: 0; }
    .code-box { background: linear-gradient(135deg, #ecfdf5, #f0fdf9); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; border-left: 4px solid #059669; }
    .code { font-size: 44px; font-weight: bold; letter-spacing: 8px; color: #059669; font-family: 'Courier New', monospace; }
    .code-label { color: #666; font-size: 12px; margin-top: 10px; }
    .warning { background: #fff3e0; padding: 15px; border-radius: 5px; border-left: 4px solid #ff9800; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌾 HubCompras</h1>
      <p style="color:#666;margin:8px 0 0">Bem-vindo ao nosso sistema!</p>
    </div>
    <p>Olá <strong>${name}</strong>,</p>
    <p>Para confirmar seu email e acessar o HubCompras, use o código abaixo:</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <p class="code-label">Este código expira em 24 horas</p>
    </div>
    <div class="warning">
      <strong>⚠️ Segurança:</strong> Nunca compartilhe este código com ninguém.
    </div>
    <p>Se você não se cadastrou no HubCompras, ignore este email.</p>
    <div class="footer">
      <p>© 2026 HubCompras · Oxentech Software</p>
    </div>
  </div>
</body>
</html>`;

// ═══════════════════════════════════════════════════════════════════════════
// ENVIAR VIA SENDGRID
// ═══════════════════════════════════════════════════════════════════════════

async function sendViaSendGrid(email, name, code) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail =
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.GMAIL_USER ||
    "oxentech.software@gmail.com";
  const fromName = process.env.SENDGRID_FROM_NAME || "HubCompras";

  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: fromEmail, name: fromName },
        subject: "✉️ Confirme seu email - HubCompras",
        content: [{ type: "text/html", value: htmlBody(code, name) }],
      }),
    });

    if (response.status === 202) {
      return {
        success: true,
        service: "sendgrid",
        messageId: response.headers.get("x-message-id") || null,
      };
    }

    const errText = await response.text().catch(() => "");
    debugWarn(`SendGrid erro HTTP ${response.status}`);
    if (errText) {
      debugWarn(`SendGrid details: ${errText.substring(0, 200)}`);
    }
    return null;
  } catch (error) {
    debugWarn(`SendGrid fetch exception: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIAR VIA GMAIL SMTP (FALLBACK)
// ═══════════════════════════════════════════════════════════════════════════

async function sendViaGmail(email, name, code) {
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
      connectionTimeout: 15000, // 15 segundos (Render é mais lento)
      socketTimeout: 15000, // 15 segundos
      greetingTimeout: 15000,
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
      pool: {
        maxConnections: 1,
        maxMessages: 1,
        rateDelta: 100,
        rateLimit: true,
      },
      logger: isDev,
      debug: isDev,
    });

    // Enviar email com promise timeout de 30 segundos (mais generoso para Render)
    const sendPromise = transporter.sendMail({
      from: `"HubCompras" <${gmailUser}>`,
      to: email,
      subject: "✉️ Confirme seu email - HubCompras",
      html: htmlBody(code, name),
    });

    // Adicionar timeout max 30 segundos
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gmail timeout")), 30000),
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    return {
      success: true,
      service: "gmail",
      messageId: info.messageId,
    };
  } catch (error) {
    debugWarn(`Gmail SMTP erro: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL COM SEGURANÇA
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const startTime = Date.now();
  debugLog(`📨 [${new Date().toISOString()}] send-verification-email start`);

  try {
    // CORS com origem restrita
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

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { email, name, code } = req.body || {};

    // ── 1. VALIDAR ENTRADA ────────────────────────────────────────────────
    const validation = validateEmailInput(email, name, code);
    if (!validation.valid) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: validation.errors,
      });
    }

    const cleanEmail = sanitizeString(email.toLowerCase());
    const cleanName = sanitizeString(name);

    // ── 2. RATE LIMITING ──────────────────────────────────────────────────
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(clientIp, cleanEmail);

    if (!rateCheck.allowed) {
      debugWarn(`Rate limit excedido: ${rateCheck.reason}`);

      res.setHeader("Retry-After", rateCheck.retryAfter);

      const message =
        rateCheck.reason === "rate_limit_ip"
          ? "Muitas requisições. Tente novamente mais tarde."
          : "Muitas tentativas de verificação. Tente novamente em 24 horas.";

      return res.status(429).json({
        error: message,
        retryAfter: rateCheck.retryAfter,
      });
    }

    debugLog("📧 Enviando verificação (rate limit ok)");

    // ── 3. REGISTRAR TENTATIVA NO BANCO ───────────────────────────────────
    // (Ignorar erros de logging em dev - tabela pode não estar criada)
    try {
      await logEmailAttempt(
        "verification",
        cleanEmail,
        cleanName,
        "✉️ Confirme seu email - HubCompras",
        "pending",
      );
    } catch (err) {
      debugWarn("Não foi possível log email:", err?.message);
    }

    // ── 4. TENTAR ENVIAR ──────────────────────────────────────────────────
    let sent = null;
    let service = null;

    // Tentar N8N primeiro
    try {
      sent = await sendViaWebhook(cleanEmail, code, cleanName);
      if (sent?.success) {
        service = sent.service;
      }
    } catch (error) {
      debugWarn(`N8N falhou: ${error.message}`);
    }

    // Fallback para SendGrid
    if (!sent) {
      sent = await sendViaSendGrid(cleanEmail, cleanName, code);
      if (sent?.success) {
        service = sent.service;
      }
    }

    // Fallback para Gmail SMTP
    if (!sent) {
      sent = await sendViaGmail(cleanEmail, cleanName, code);
      if (sent?.success) {
        service = sent.service;
      }
    }

    // ── 5. ATUALIZAR LOG ──────────────────────────────────────────────────
    if (sent?.success) {
      try {
        await updateEmailLogStatus(
          cleanEmail,
          "sent",
          service,
          sent.messageId || null,
        );
      } catch (err) {
        debugWarn("Não foi possível atualizar log:", err?.message);
      }

      return res.status(200).json({
        success: true,
        message: "Email de verificação enviado com sucesso",
        service,
        messageId: sent.messageId || null,
      });
    }

    console.error("❌ Falha no envio de verificação (fallback)");

    try {
      await updateEmailLogStatus(
        cleanEmail,
        "failed",
        "none",
        null,
        "Ambos SendGrid e Gmail falharam",
      );
    } catch (err) {
      debugWarn("Não foi possível atualizar log:", err?.message);
    }

    return res.status(200).json({
      success: false,
      service: "fallback",
      queued: false,
      message:
        "Não foi possível enviar o email agora. Use 'Reenviar Código' em alguns minutos.",
      error: "email_service_unavailable",
      userAction: "Tente clicar em 'Reenviar Código' após alguns minutos",
    });
  } catch (error) {
    console.error("❌ Erro ao enviar email de verificacao:", error.message);
    if (isDev && error.stack) {
      console.error(error.stack);
    }

    // Não retornar detalhes de erro em produção
    const message =
      process.env.NODE_ENV === "production"
        ? "Erro ao enviar email. Tente novamente."
        : error.message;

    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}
