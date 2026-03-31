/**
 * N8N Email Client
 * Integrates with n8n workflow to send emails via Gmail
 */

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

/**
 * Send email through n8n webhook
 * @param {Object} payload - Email payload
 * @param {string} payload.to - Recipient email
 * @param {string} payload.type - Email type (verification, password_reset, login_alert)
 * @param {string} payload.code - Verification or reset code
 * @param {string} payload.name - User name
 * @param {string} payload.resetUrl - Reset password URL (for password_reset type)
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
  return sendEmailViaWebhook({
    type: 'email_verification',
    to: email,
    code: verificationCode,
    name: userName,
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
  return sendEmailViaWebhook({
    type: 'password_reset',
    to: email,
    code: resetCode,
    resetUrl: resetUrl,
    name: userName,
  });
}

/**
 * Send login alert email
 * @param {string} email - User email
 * @param {string} userName - User name
 * @param {string} location - Login location (optional)
 */
export async function sendLoginAlertEmail(email, userName, location = 'Unknown') {
  return sendEmailViaWebhook({
    type: 'login_alert',
    to: email,
    name: userName,
    location: location,
  });
}
