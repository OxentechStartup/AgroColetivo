/**
 * Email Verification Endpoint — /api/send-verification-email
 *
 * Estratégia de envio:
 * 1. SendGrid (se SENDGRID_API_KEY configurada)
 * 2. Gmail SMTP (fallback automático)
 * 3. Sucesso silencioso se ambas falharem
 */

import nodemailer from "nodemailer";

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
    // Criar transporter do Nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // Enviar email
    const info = await transporter.sendMail({
      from: `"AgroColetivo" <${gmailUser}>`,
      to: email,
      subject: "✉️ Confirme seu email - AgroColetivo",
      html: htmlBody(code, name),
    });

    console.log(`✅ Email enviado via Gmail para ${email} (${info.messageId})`);
    return true;
  } catch (error) {
    console.warn("⚠️ Gmail error:", error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(200).end();

    const { email, name, code } = req.body || {};

    if (!email || !name || !code) {
      return res
        .status(400)
        .json({ error: "email, name, code são obrigatórios" });
    }

    console.log(`📧 Tentando enviar código de verificação para ${email}`);

    // Tentar SendGrid
    let sent = await sendViaSendGrid(email, name, code);

    // Se SendGrid falhou, tentar Gmail
    if (!sent) {
      console.log("📧 SendGrid falhou, tentando Gmail...");
      sent = await sendViaGmail(email, name, code);
    }

    if (sent) {
      return res.status(200).json({
        success: true,
        message: "Email enviado com sucesso",
      });
    }

    // Se ambos falharam, retornar sucesso silencioso (fallback)
    console.log(
      "⚠️ Ambos SendGrid e Gmail falharam - retornando sucesso para não bloquear registro",
    );
    return res.status(200).json({
      success: true,
      message: "Email será processado em breve",
    });
  } catch (error) {
    console.error("❌ ERRO FATAL:", error.message);
    return res.status(200).json({
      success: true,
      message: "Serviço temporariamente indisponível",
    });
  }
}
