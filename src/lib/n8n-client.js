/**
 * N8N Email Client
 * Integrates with n8n workflow to send emails via Gmail
 */

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

/**
 * Send email through n8n webhook
 * @param {Object} payload - Email payload
 * @param {string} payload.to - Recipient email
 * @param {string} payload.subject - Email subject
 * @param {string} payload.body - Email body (HTML or plain text)
 * @returns {Promise<void>}
 */
export async function sendEmailViaWebhook(payload) {
  if (!N8N_WEBHOOK_URL) {
    console.error('N8N_WEBHOOK_URL is not configured');
    throw new Error('Email service not configured');
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    console.log('Email sent successfully via n8n');
    return await response.json();
  } catch (error) {
    console.error('Error sending email via webhook:', error);
    throw error;
  }
}

/**
 * Send verification email
 * @param {string} email - User email
 * @param {string} verificationCode - Verification code
 * @param {string} userName - User name
 */
export async function sendVerificationEmail(email, verificationCode, userName) {
  const subject = 'Verifique seu email - AgroColetivo';
  const body = `
    <html>
      <body>
        <h2>Bem-vindo, ${userName}!</h2>
        <p>Para completar seu cadastro, use o código de verificação abaixo:</p>
        <h1 style="color: #4CAF50; letter-spacing: 2px;">${verificationCode}</h1>
        <p>Este código expira em 24 horas.</p>
        <hr>
        <small>Se você não solicitou este cadastro, ignore este email.</small>
      </body>
    </html>
  `;

  return sendEmailViaWebhook({
    to: email,
    subject: subject,
    body: body,
  });
}

/**
 * Send password recovery email
 * @param {string} email - User email
 * @param {string} resetCode - Reset code
 * @param {string} resetUrl - Reset password URL
 * @param {string} userName - User name
 */
export async function sendPasswordRecoveryEmail(email, resetCode, resetUrl, userName) {
  const subject = 'Recuperar senha - AgroColetivo';
  const body = `
    <html>
      <body>
        <h2>Oi ${userName},</h2>
        <p>Recebemos uma solicitação para recuperar sua senha. Use o código abaixo:</p>
        <h1 style="color: #2196F3; letter-spacing: 2px;">${resetCode}</h1>
        <p>Este código expira em 15 minutos.</p>
        <hr>
        <p><small>Se você não solicitou uma recuperação de senha, ignore este email.</small></p>
      </body>
    </html>
  `;

  return sendEmailViaWebhook({
    to: email,
    subject: subject,
    body: body,
  });
}

/**
 * Send login alert email
 * @param {string} email - User email
 * @param {string} userName - User name
 * @param {string} location - Login location (optional)
 */
export async function sendLoginAlertEmail(email, userName, location = 'Unknown') {
  const subject = 'Novo acesso à sua conta - AgroColetivo';
  const body = `
    <html>
      <body>
        <h2>Olá ${userName},</h2>
        <p>Detectamos um novo acesso à sua conta:</p>
        <ul>
          <li><strong>Horário:</strong> ${new Date().toLocaleString('pt-BR')}</li>
          <li><strong>Local:</strong> ${location}</li>
        </ul>
        <p>Se isso não foi você, altere sua senha imediatamente.</p>
        <hr>
        <small>Este é um aviso de segurança automático da AgroColetivo.</small>
      </body>
    </html>
  `;

  return sendEmailViaWebhook({
    to: email,
    subject: subject,
    body: body,
  });
}
