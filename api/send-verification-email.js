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
 * Estratégia de envio:
 * 1. SendGrid (se SENDGRID_API_KEY configurada)
 * 2. Gmail SMTP (fallback automático)
 * 3. Sucesso silencioso se ambas falharem
 */

import nodemailer from "nodemailer";
import {
  getClientIp,
  validateEmailInput,
  sanitizeString,
  checkRateLimit,
  logEmailAttempt,
  updateEmailLogStatus,
} from "../src/lib/email-security.js";

const htmlBody = (code, name) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #2c5f2d; font-size: 28px; margin: 0; }
    .code-box { background: linear-gradient(135deg, #e8f5e9, #f1f8e9); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; border-left: 4px solid #2c5f2d; }
    .code { font-size: 44px; font-weight: bold; letter-spacing: 8px; color: #2c5f2d; font-family: 'Courier New', monospace; }
    .code-label { color: #666; font-size: 12px; margin-top: 10px; }
    .warning { background: #fff3e0; padding: 15px; border-radius: 5px; border-left: 4px solid #ff9800; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌾 AgroColetivo</h1>
      <p style="color:#666;margin:8px 0 0">Bem-vindo ao nosso sistema!</p>
    </div>
    <p>Olá <strong>${name}</strong>,</p>
    <p>Para confirmar seu email e acessar o AgroColetivo, use o código abaixo:</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <p class="code-label">Este código expira em 24 horas</p>
    </div>
    <div class="warning">
      <strong>⚠️ Segurança:</strong> Nunca compartilhe este código com ninguém.
    </div>
    <p>Se você não se cadastrou no AgroColetivo, ignore este email.</p>
    <div class="footer">
      <p>© 2026 AgroColetivo · Oxentech Software</p>
    </div>
  </div>
</body>
</html>`;

// ═══════════════════════════════════════════════════════════════════════════
// ENVIAR VIA SENDGRID
// ═══════════════════════════════════════════════════════════════════════════

async function sendViaSendGrid(email, name, code) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.log("⚠️ SendGrid: SENDGRID_API_KEY não configurada");
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
        from: { email: "oxentech.software@gmail.com", name: "AgroColetivo" },
        subject: "✉️ Confirme seu email - AgroColetivo",
        content: [{ type: "text/html", value: htmlBody(code, name) }],
      }),
    });

    if (response.status === 202) {
      console.log(`✅ Email enviado via SendGrid para ${email}`);
      return true;
    }

    const errText = await response.text();
    console.warn(`⚠️ SendGrid erro: ${response.status}`, errText);
    return null;
  } catch (error) {
    console.warn("⚠️ SendGrid fetch error:", error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIAR VIA GMAIL SMTP (FALLBACK)
// ═══════════════════════════════════════════════════════════════════════════

async function sendViaGmail(email, name, code) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    console.log("⚠️ Gmail: GMAIL_USER ou GMAIL_APP_PASSWORD não configuradas");
    return null;
  }

  try {
    // Criar transporter do Nodemailer COM TIMEOUT
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      connectionTimeout: 5000, // 5 segundos
      socketTimeout: 5000, // 5 segundos
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // Enviar email com promise timeout de 10 segundos
    const sendPromise = transporter.sendMail({
      from: `"AgroColetivo" <${gmailUser}>`,
      to: email,
      subject: "✉️ Confirme seu email - AgroColetivo",
      html: htmlBody(code, name),
    });

    // Adicionar timeout max 10 segundos
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gmail timeout")), 10000),
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    console.log(`✅ Email enviado via Gmail para ${email} (${info.messageId})`);
    return true;
  } catch (error) {
    console.warn("⚠️ Gmail error:", error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL COM SEGURANÇA
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  try {
    // CORS com origem restrita
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://agro-coletivo.vercel.app",
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
      console.warn(
        `⚠️ Rate limit excedido: ${rateCheck.reason} (IP: ${clientIp})`,
      );

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

    console.log(`📧 Enviando verificação para ${cleanEmail} (IP: ${clientIp})`);

    // ── 3. REGISTRAR TENTATIVA NO BANCO ───────────────────────────────────
    // (Ignorar erros de logging em dev - tabela pode não estar criada)
    try {
      await logEmailAttempt(
        "verification",
        cleanEmail,
        cleanName,
        "✉️ Confirme seu email - AgroColetivo",
        "pending",
      );
    } catch (err) {
      console.warn("⚠️ Não foi possível log email:", err?.message);
    }

    // ── 4. TENTAR ENVIAR ──────────────────────────────────────────────────
    let sent = null;
    let service = null;

    // Tentar SendGrid primeiro
    sent = await sendViaSendGrid(cleanEmail, cleanName, code);
    if (sent) {
      service = "sendgrid";
    }

    // Se SendGrid falhou, tentar Gmail
    if (!sent) {
      console.log("📧 SendGrid falhou, tentando Gmail...");
      sent = await sendViaGmail(cleanEmail, cleanName, code);
      if (sent) {
        service = "gmail";
      }
    }

    // ── 5. ATUALIZAR LOG ──────────────────────────────────────────────────
    if (sent) {
      try {
        await updateEmailLogStatus(cleanEmail, "sent", service);
      } catch (err) {
        console.warn("⚠️ Não foi possível atualizar log:", err?.message);
      }

      return res.status(200).json({
        success: true,
        message: "Email de verificação enviado com sucesso",
        service,
      });
    }

    // Ambos falharam - fallback silencioso
    console.log(
      "⚠️ SendGrid e Gmail falharam - retornando sucesso para não bloquear",
    );
    try {
      await updateEmailLogStatus(
        cleanEmail,
        "pending",
        "fallback",
        null,
        "Ambos SendGrid e Gmail falharam",
      );
    } catch (err) {
      console.warn("⚠️ Não foi possível atualizar log:", err?.message);
    }

    return res.status(200).json({
      success: false,
      queued: false,
      message: "Não foi possível enviar o email agora",
    });
  } catch (error) {
    console.error("❌ ERRO FATAL:", error.message);

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
