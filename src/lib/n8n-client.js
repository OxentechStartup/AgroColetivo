import { BRAND_NAME } from "../constants/branding";

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

/**
 * Send email through n8n webhook
 * @param {Object} payload - Email payload
 * @param {string} payload.to - Recipient email
 * @param {string} payload.subject - Email subject
 * @param {string} payload.body - Email body (HTML or plain text)
 * @returns {Promise<Object>}
 */
export async function sendEmailViaWebhook(payload) {
  if (!N8N_WEBHOOK_URL) {
    console.error("N8N_WEBHOOK_URL is not configured");
    throw new Error("Email service not configured");
  }

  try {
    // Timeout de 10 segundos para webhook
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    console.log("✅ Email enviado com sucesso via n8n");
    return await response.json().catch(() => ({ success: true }));
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("N8N webhook timeout (10s)");
      throw new Error("Email service timeout - will retry");
    }
    console.error("Error sending email via webhook:", error);
    throw error;
  }
}

/**
 * Professional HTML template for verification email
 */
function verificationEmailHtml(code, name) {
  return `<!DOCTYPE html>
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
      <h1>🌾 ${BRAND_NAME}</h1>
      <p style="color:#666;margin:8px 0 0">Bem-vindo ao nosso sistema!</p>
    </div>
    <p>Olá <strong>${name}</strong>,</p>
    <p>Para confirmar seu email e acessar o ${BRAND_NAME}, use o código abaixo:</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <p class="code-label">Este código expira em 24 horas</p>
    </div>
    <div class="warning">
      <strong>⚠️ Segurança:</strong> Nunca compartilhe este código com ninguém.
    </div>
    <p>Se você não se cadastrou no ${BRAND_NAME}, ignore este email.</p>
    <div class="footer">
      <p>© 2026 ${BRAND_NAME} · Oxentech Software</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send verification email
 * @param {string} email - User email
 * @param {string} verificationCode - Verification code
 * @param {string} userName - User name
 */
export async function sendVerificationEmail(email, verificationCode, userName) {
  return sendEmailViaWebhook({
    to: email,
    subject: `✉️ Confirme seu email - ${BRAND_NAME}`,
    body: verificationEmailHtml(verificationCode, userName || "Usuário"),
  });
}

/**
 * Professional HTML template for password recovery email
 */
function passwordRecoveryEmailHtml(code, name) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #fff3e0; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #d97706; font-size: 28px; margin: 0; }
    .code-box { background: linear-gradient(135deg, #fef3c7, #fef9e7); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; border-left: 4px solid #d97706; }
    .code { font-size: 44px; font-weight: bold; letter-spacing: 8px; color: #d97706; font-family: 'Courier New', monospace; }
    .code-label { color: #666; font-size: 12px; margin-top: 10px; }
    .warning { background: #fee2e2; padding: 15px; border-radius: 5px; border-left: 4px solid #dc2626; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 ${BRAND_NAME}</h1>
      <p style="color:#666;margin:8px 0 0">Redefinir Senha</p>
    </div>
    <p>Olá <strong>${name}</strong>,</p>
    <p>Recebemos uma solicitação para redefinir sua senha no ${BRAND_NAME}. Use o código abaixo para prosseguir:</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <p class="code-label">Este código expira em 15 minutos</p>
    </div>
    <div class="warning">
      <strong>🔒 Segurança:</strong> Nunca compartilhe este código com ninguém. Se você não solicitou redefinição de senha, ignore este email.
    </div>
    <p>Por motivos de segurança, esta solicitação foi registrada em nossos servidores.</p>
    <div class="footer">
      <p>© 2026 HubCompras · Oxentech Software</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send password recovery email
 * @param {string} email - User email
 * @param {string} resetCode - Reset code
 * @param {string} resetUrl - Reset password URL (unused, kept for compat)
 * @param {string} userName - User name
 */
export async function sendPasswordRecoveryEmail(
  email,
  resetCode,
  resetUrl,
  userName,
) {
  return sendEmailViaWebhook({
    to: email,
    subject: `🔐 Redefinir sua senha - ${BRAND_NAME}`,
    body: passwordRecoveryEmailHtml(resetCode, userName || "Usuário"),
  });
}

/**
 * Send login alert email
 * @param {string} email - User email
 * @param {string} userName - User name
 * @param {string} location - Login location (optional)
 */
export async function sendLoginAlertEmail(
  email,
  userName,
  location = "Unknown",
) {
  const subject = `Novo acesso à sua conta - ${BRAND_NAME}`;
  const body = `
    <html>
      <body>
        <h2>Olá ${userName},</h2>
        <p>Detectamos um novo acesso à sua conta:</p>
        <ul>
          <li><strong>Horário:</strong> ${new Date().toLocaleString("pt-BR")}</li>
          <li><strong>Local:</strong> ${location}</li>
        </ul>
        <p>Se isso não foi você, altere sua senha imediatamente.</p>
        <hr>
        <small>Este é um aviso de segurança automático da ${BRAND_NAME}.</small>
      </body>
    </html>
  `;

  return sendEmailViaWebhook({
    to: email,
    subject: subject,
    body: body,
  });
}
