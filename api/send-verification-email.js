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

  console.log(`   ➤ SendGrid API Key exists: ${apiKey ? "SIM" : "NÃO"}`);
  console.log(`   ➤ Length: ${apiKey ? apiKey.length : 0}`);

  if (!apiKey || !apiKey.trim()) {
    console.log("   ❌ Pulando SendGrid: chave não configurada");
    return null;
  }

  try {
    console.log(`   📤 Enviando via API SendGrid para ${email}...`);
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

    console.log(`   ⬅️ SendGrid respondeu com status: ${response.status}`);

    if (response.status === 202) {
      console.log(`   ✅ Email enfileirado no SendGrid`);
      return true;
    }

    const errText = await response.text().catch(() => "");
    console.error(`   ❌ SendGrid erro HTTP ${response.status}`);
    if (errText) {
      console.error(`   Details: ${errText.substring(0, 200)}`);
    }
    return null;
  } catch (error) {
    console.error(`   ❌ SendGrid fetch exception: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIAR VIA GMAIL SMTP (FALLBACK)
// ═══════════════════════════════════════════════════════════════════════════

async function sendViaGmail(email, name, code) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  console.log(`   ➤ Gmail User exists: ${gmailUser ? "SIM" : "NÃO"}`);
  console.log(
    `   ➤ Gmail App Password exists: ${gmailPassword ? "SIM" : "NÃO"}`,
  );

  if (!gmailUser || !gmailPassword) {
    console.log("   ❌ Pulando Gmail: credenciais não configuradas");
    return null;
  }

  try {
    // Criar transporter do Nodemailer COM TIMEOUT
    console.log(`   📤 Conectando ao SMTP do Gmail...`);
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

    console.log(`   ⏱️ Enviando (timeout: 10s)...`);
    const info = await Promise.race([sendPromise, timeoutPromise]);

    console.log(`   ✅ Email aceito pelo Gmail (MessageID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`   ❌ Gmail SMTP erro: ${error.message}`);
    if (error.message.includes("EAUTH")) {
      console.error("      → Credenciais inválidas ou senha de app incorreta");
    } else if (error.message.includes("ETIMEDOUT")) {
      console.error("      → Timeout na conexão com Gmail");
    } else if (error.message.includes("timeout")) {
      console.error("      → Timeout de 10s excedido no envio");
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL COM SEGURANÇA
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📨 [${new Date().toISOString()}] HANDLER INICIADO`);
  console.log(`   Método: ${req.method}`);
  console.log(`   Body: ${JSON.stringify(req.body)}`);
  console.log(`=`.repeat(80));

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
      console.log("✅ CORS preflight respondido");
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      console.log("❌ Método não é POST");
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { email, name, code } = req.body || {};
    console.log(
      `📧 Email recebido: ${email}, Name: ${name}, Code: ${code ? "presente" : "FALTANDO"}`,
    );

    // ── 1. VALIDAR ENTRADA ────────────────────────────────────────────────
    const validation = validateEmailInput(email, name, code);
    if (!validation.valid) {
      console.log(`❌ Validação falhou: ${JSON.stringify(validation.errors)}`);
      return res.status(400).json({
        error: "Dados inválidos",
        details: validation.errors,
      });
    }
    console.log("✅ Validação passou");

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

    console.log("🔄 Tentando SendGrid...");
    sent = await sendViaSendGrid(cleanEmail, cleanName, code);
    if (sent) {
      service = "sendgrid";
      console.log("✅ SendGrid sucesso!");
    } else {
      console.log("❌ SendGrid falhou, tentando Gmail...");
    }

    if (!sent) {
      console.log("🔄 Tentando Gmail SMTP...");
      sent = await sendViaGmail(cleanEmail, cleanName, code);
      if (sent) {
        service = "gmail";
        console.log("✅ Gmail sucesso!");
      } else {
        console.log("❌ Gmail também falhou!");
      }
    }

    // ── 5. ATUALIZAR LOG ──────────────────────────────────────────────────
    if (sent) {
      console.log(`🟢 Email foi enviado com sucesso via ${service}`);
      try {
        await updateEmailLogStatus(cleanEmail, "sent", service);
        console.log("✅ Log de email atualizado no banco");
      } catch (err) {
        console.warn("⚠️ Não foi possível atualizar log:", err?.message);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ RESPOSTA SUCESSO (${duration}ms) - Serviço: ${service}`);
      return res.status(200).json({
        success: true,
        message: "Email de verificação enviado com sucesso",
        service,
      });
    }

    // Ambos falharam - retornar erro claro
    console.error("❌ FALHA CRÍTICA: SendGrid e Gmail ambos falharam");
    console.error("   ℹ️ Próximas ações a verificar:");
    console.error(
      `   1. SENDGRID_API_KEY está configurada? ${process.env.SENDGRID_API_KEY ? "SIM" : "NÃO"}`,
    );
    console.error(
      `   2. GMAIL_USER está configurada? ${process.env.GMAIL_USER ? "SIM" : "NÃO"}`,
    );
    console.error(
      `   3. GMAIL_APP_PASSWORD está configurada? ${process.env.GMAIL_APP_PASSWORD ? "SIM" : "NÃO"}`,
    );
    console.error("   4. Verifique se são as credenciais corretas");

    try {
      await updateEmailLogStatus(
        cleanEmail,
        "failed",
        "none",
        null,
        "Ambos SendGrid e Gmail falharam",
      );
    } catch (err) {
      console.warn("⚠️ Não foi possível atualizar log:", err?.message);
    }

    const duration = Date.now() - startTime;
    console.log(`❌ RESPOSTA ERRO 503 (${duration}ms)`);
    return res.status(503).json({
      success: false,
      message:
        "Serviço de email temporariamente indisponível. Tente novamente em alguns minutos.",
      error: "email_service_unavailable",
      userAction: "Tente clique em 'Reenviar Código' após alguns minutos",
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ ERRO FATAL (${duration}ms):`);
    console.error(`   Messagem: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);

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
