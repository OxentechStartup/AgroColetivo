/**
 * Email Service
 *
 * ⚠️  Para PRODUÇÃO:
 * - Usar SendGrid, Mailgun, ou similar (não nodemailer no frontend!)
 * - nodemailer é apenas para testes server-side
 * - Credenciais nunca devem estar no frontend
 *
 * Para DEMO:
 * - Use /send-email-test.js como referência
 * - Configure EMAIL_PASS como App Password do Gmail
 */

/**
 * Função que SERIA chamada para verificar email
 * Em produção, isso seria um endpoint backend
 */
export async function sendVerificationEmail(email, verificationCode) {
  // ❌ NÃO pode chamar nodemailer do frontend!
  // Isso seria feito via:
  // 1. Supabase Edge Function
  // 2. Backend separado (Node.js, Python, etc)
  // 3. Serviço externo (SendGrid, Mailgun, etc)

  console.warn("⚠️  Verificação de email configurada para DEMO");
  console.warn(`   Email: ${email}`);
  console.warn(`   Código: ${verificationCode}`);
  console.warn(`   Em produção: usar backend para enviar!`);

  return {
    success: true,
    message:
      "Email de verificação será enviado (configure backend em produção)",
  };
}

/**
 * Template HTML para email de verificação
 */
export function getVerificationEmailTemplate(userName, verificationCode) {
  return `
    <h2>Bem-vindo ao AgroColetivo! 👋</h2>
    <p>Olá ${userName},</p>
    <p>Para completar seu registro, verifique seu email usando o código abaixo:</p>
    
    <h3 style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px;">
      ${verificationCode}
    </h3>
    
    <p>Este código expira em 24 horas.</p>
    <p>Não compartilhe este código com ninguém!</p>
    
    <hr>
    <p style="font-size: 12px; color: #666;">
      Se não solicitou este email, ignore-o.
    </p>
  `;
}

export default {
  sendVerificationEmail,
  getVerificationEmailTemplate,
};
