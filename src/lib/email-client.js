/**
 * Email Client — Frontend Safe
 *
 * Em produção (Vercel): chama /api/send-verification-email
 *   → Vercel Serverless Function que envia via Gmail SMTP
 *
 * Em desenvolvimento local: chama http://localhost:3001
 *   → Rode: node email-server.cjs
 */

export async function sendVerificationEmail(userEmail, userName, verificationCode) {
  // Em produção usa endpoint relativo (Vercel Serverless Function)
  // Em dev usa localhost:3001 (email-server.cjs rodando localmente)
  const isDev = import.meta.env.DEV;
  const emailServerUrl = isDev
    ? (import.meta.env.VITE_EMAIL_SERVER_URL || "http://localhost:3001")
    : "";

  const endpoint = `${emailServerUrl}/api/send-verification-email`;

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
        service: isDev ? "localhost" : "vercel-serverless",
        messageId: data.messageId,
        message: "Email enviado com sucesso",
      };
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Servidor retornou ${response.status}`);
    }
  } catch (error) {
    console.warn("⚠️ Não foi possível enviar email de verificação:", error?.message);

    // Fallback silencioso — não bloqueia o registro
    // O usuário pode reenviar o código pela tela de verificação
    return {
      success: false,
      service: "fallback",
      message: "Email será reenviado manualmente",
    };
  }
}
