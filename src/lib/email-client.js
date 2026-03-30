/**
 * Email Client — Frontend Safe
 *
 * Em desenvolvimento: chama /api/send-verification-email
 *   → Vite proxy para handlers locais em /api/
 *
 * Em produção: chama /api/send-verification-email
 *   → Vercel Serverless Functions que enviam via Gmail SMTP
 */

export async function sendVerificationEmail(
  userEmail,
  userName,
  verificationCode,
) {
  // Usa endpoint relativo em dev e produção
  // Dev: /api/send-verification-email (Vite proxy)
  // Produção: /api/send-verification-email (Vercel Serverless)
  const endpoint = "/api/send-verification-email";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        name: userName,
        code: verificationCode,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        service: "api-endpoint",
        messageId: data.messageId,
        message: "Email enviado com sucesso",
      };
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Servidor retornou ${response.status}`);
    }
  } catch (error) {
    console.warn(
      "⚠️ Não foi possível enviar email de verificação:",
      error?.message,
    );

    // Fallback silencioso — não bloqueia o registro
    // O usuário pode reenviar o código pela tela de verificação
    return {
      success: false,
      service: "fallback",
      message: "Email será reenviado manualmente",
    };
  }
}

/**
 * Send Password Recovery Email
 * Envia email com código de recuperação de senha
 */
export async function sendPasswordRecoveryEmail(
  userEmail,
  userName,
  recoveryCode,
) {
  const endpoint = "/api/send-password-recovery-email";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        name: userName,
        code: recoveryCode,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        service: "api-endpoint",
        messageId: data.messageId,
        message: "Email de recuperação enviado com sucesso",
      };
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Servidor retornou ${response.status}`);
    }
  } catch (error) {
    console.warn(
      "⚠️ Não foi possível enviar email de recuperação:",
      error?.message,
    );

    // Fallback silencioso — não bloqueia o fluxo
    return {
      success: false,
      service: "fallback",
      message: "Email será reenviado manualmente",
    };
  }
}

/**
 * Send Login Alert Email
 * Envia email de aviso quando houver login na conta
 */
export async function sendLoginAlertEmail(userEmail, userName, details = {}) {
  const endpoint = "/api/send-login-alert-email";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        name: userName,
        details,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        service: "api-endpoint",
        messageId: data.messageId,
        message: "Email de aviso de login enviado com sucesso",
      };
    }

    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Servidor retornou ${response.status}`);
  } catch (error) {
    console.warn(
      "⚠️ Não foi possível enviar email de aviso de login:",
      error?.message,
    );

    // Não bloquear login por falha de email de aviso
    return {
      success: false,
      service: "fallback",
      message: "Login concluído sem envio do aviso por email",
    };
  }
}
