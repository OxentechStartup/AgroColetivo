/**
 * N8N Email Service (Server-side)
 * Integra com webhook do n8n para enviar emails via Gmail
 *
 * Uso:
 * import { sendEmailViaN8N } from '../src/lib/n8n-service.js';
 * const result = await sendEmailViaN8N({ to, subject, body });
 */

const N8N_WEBHOOK_URL =
  process.env.VITE_N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;

/**
 * Envia email através do webhook do n8n
 * @param {Object} payload - Dados do email
 * @param {string} payload.to - Email do destinatário
 * @param {string} payload.subject - Assunto do email
 * @param {string} payload.body - Corpo do email (HTML)
 * @returns {Promise<Object>} Resultado do envio
 */
export async function sendEmailViaN8N(payload) {
  if (!N8N_WEBHOOK_URL) {
    console.error("❌ N8N_WEBHOOK_URL não está configurada");
    throw new Error("N8N webhook não configurado");
  }

  if (!payload.to || !payload.subject || !payload.body) {
    throw new Error("Campos obrigatórios: to, subject, body");
  }

  try {
    console.log(`📧 Enviando email via n8n para ${payload.to}...`);
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`❌ N8N respondeu com status ${response.status}`);
      if (errorText)
        console.error(`   Detalhes: ${errorText.substring(0, 200)}`);
      throw new Error(`Webhook n8n falhou com status ${response.status}`);
    }

    const result = await response.json().catch(() => ({}));
    console.log(`✅ Email enviado com sucesso via n8n para ${payload.to}`);

    return {
      success: true,
      service: "n8n",
      messageId: result.messageId || null,
      result: result,
    };
  } catch (error) {
    console.error(`❌ Erro ao enviar email via n8n:`, error.message);
    throw error;
  }
}

/**
 * Função genérica para enviar qualquer tipo de email
 * @param {Object} options - Opções do email
 * @param {string} options.to - Email do destinatário
 * @param {string} options.subject - Assunto do email
 * @param {string} options.body - Corpo do email (HTML)
 * @returns {Promise<Object>} Resultado do envio
 */
export async function sendEmail(options) {
  return sendEmailViaN8N(options);
}

/**
 * Envia email de verificação
 * @param {string} email - Email do usuário
 * @param {string} verificationCode - Código de verificação
 * @param {string} userName - Nome do usuário
 */
export async function sendVerificationEmail(email, verificationCode, userName) {
  const body = `
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
      <h1>🌾 HubCompras</h1>
      <p style="color:#666;margin:8px 0 0">Bem-vindo ao nosso sistema!</p>
    </div>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Para confirmar seu email e acessar o HubCompras, use o código abaixo:</p>
    <div class="code-box">
      <div class="code">${verificationCode}</div>
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

  return sendEmailViaN8N({
    to: email,
    subject: "✉️ Confirme seu email - HubCompras",
    body: body,
  });
}

/**
 * Envia email de recuperação de senha
 * @param {string} email - Email do usuário
 * @param {string} resetCode - Código de reset
 * @param {string} userName - Nome do usuário
 */
export async function sendPasswordRecoveryEmail(email, resetCode, userName) {
  const body = `
<!DOCTYPE html>
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
      <h1>🔐 HubCompras</h1>
      <p style="color:#666;margin:8px 0 0">Redefinir Senha</p>
    </div>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Recebemos uma solicitação para redefinir sua senha no HubCompras. Use o código abaixo para prosseguir:</p>
    <div class="code-box">
      <div class="code">${resetCode}</div>
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

  return sendEmailViaN8N({
    to: email,
    subject: "🔐 Redefinir sua senha - HubCompras",
    body: body,
  });
}

/**
 * Envia email de aviso de login
 * @param {string} email - Email do usuário
 * @param {string} userName - Nome do usuário
 * @param {Object} details - Detalhes do login (timestamp, platform, userAgent)
 */
export async function sendLoginAlertEmail(email, userName, details = {}) {
  const when = details?.timestamp
    ? new Date(details.timestamp).toLocaleString("pt-BR")
    : new Date().toLocaleString("pt-BR");

  const device = details?.platform || "Dispositivo não identificado";
  const browser = details?.userAgent || "Navegador não identificado";

  const body = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; }
    .header { text-align: center; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { color: #2c5f2d; font-size: 26px; margin: 0; }
    .info { background: #f9fafb; border-left: 4px solid #2c5f2d; padding: 14px; border-radius: 6px; margin: 16px 0; }
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

    <p>Olá <strong>${userName}</strong>,</p>
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

  return sendEmailViaN8N({
    to: email,
    subject: "🔓 Novo acesso à sua conta - HubCompras",
    body: body,
  });
}
