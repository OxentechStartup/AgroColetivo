/**
 * Email Service - Gmail (Grátis + Real) e Ethereal (Teste)
 *
 * Este módulo encapsula a lógica de envio de emails com suporte para:
 * - Gmail: SMTP grátis, entrega real via oxentech.startup@gmail.com
 * - Ethereal: Teste local, não entrega real
 */

export async function sendVerificationEmail(
  userEmail,
  userName,
  verificationCode,
) {
  try {
    // Usar Gmail se tiver as credenciais, senão Ethereal
    const useGmail =
      process.env.GMAIL_USER &&
      process.env.GMAIL_APP_PASSWORD &&
      process.env.GMAIL_USER.trim().length > 0 &&
      process.env.GMAIL_APP_PASSWORD.trim().length > 0;

    if (useGmail) {
      return await sendViaGmail(userEmail, userName, verificationCode);
    } else {
      return await sendViaEthereal(userEmail, userName, verificationCode);
    }
  } catch (error) {
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GMAIL (PRODUÇÃO - 100% GRÁTIS VIA APP PASSWORD)
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaGmail(userEmail, userName, verificationCode) {
  try {
    // Importar Nodemailer
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, ""), // Remove espaços
      },
    });

    const htmlEmail = getVerificationEmailTemplate(userName, verificationCode);

    const result = await transporter.sendMail({
      from: `AgroColetivo <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: "✉️ Confirme seu email - AgroColetivo",
      html: htmlEmail,
    });

    if (!result.messageId) {
      throw new Error("Falha ao enviar email via Gmail");
    }

    return {
      success: true,
      service: "gmail",
      messageId: result.messageId,
      message: "Email enviado com sucesso",
    };
  } catch (error) {
    console.error("Erro ao enviar via Gmail:", error.message);
    // Fallback para Ethereal se Gmail falhar
    return await sendViaEthereal(userEmail, userName, verificationCode);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ETHEREAL (TESTE LOCAL - PREVIEW SEM ENTREGA REAL)
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaEthereal(userEmail, userName, verificationCode) {
  try {
    const nodemailer = await import("nodemailer");

    // Criar conta Ethereal de teste
    const testAccount = await nodemailer.default.createTestAccount();

    const transporter = nodemailer.default.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const htmlEmail = getVerificationEmailTemplate(userName, verificationCode);

    const info = await transporter.sendMail({
      from: `"AgroColetivo" <${testAccount.user}>`,
      to: userEmail,
      subject: "✉️ Confirme seu email - AgroColetivo",
      html: htmlEmail,
    });

    const previewUrl = nodemailer.default.getTestMessageUrl(info);

    return {
      success: true,
      service: "ethereal",
      messageId: info.messageId,
      previewUrl: previewUrl,
      message: "Email de teste enviado",
    };
  } catch (error) {
    console.error("Erro ao enviar via Ethereal:", error.message);
    throw error;
  }
}

export function getVerificationEmailTemplate(userName, verificationCode) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; }
    .header { text-align: center; color: #2c5f2d; margin-bottom: 30px; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; }
    .header h1 { font-size: 32px; margin: 10px 0; }
    .content { color: #333; line-height: 1.6; }
    .content p { margin: 15px 0; }
    .code-box { background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; border-left: 4px solid #2c5f2d; }
    .code { font-size: 44px; font-weight: bold; letter-spacing: 8px; color: #2c5f2d; font-family: 'Courier New', monospace; }
    .code-label { color: #666; font-size: 12px; margin-top: 10px; }
    .warning { background: #fff3e0; padding: 15px; border-radius: 5px; border-left: 4px solid #ff9800; margin: 20px 0; color: #333; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌾 AgroColetivo</h1>
      <p>Bem-vindo ao nosso sistema!</p>
    </div>
    
    <div class="content">
      <p>Olá <strong>${userName}</strong>,</p>
      
      <p>Obrigado por se cadastrar no <strong>AgroColetivo</strong>! 🙌</p>
      
      <p>Para completar seu registro e confirmar seu endereço de email, use o código abaixo:</p>
      
      <div class="code-box">
        <div class="code">${verificationCode}</div>
        <p class="code-label">Este código expira em 24 horas</p>
      </div>
      
      <p>Cole este código na página de confirmação do AgroColetivo para completar seu cadastro.</p>
      
      <div class="warning">
        <strong>⚠️ Segurança:</strong> Nunca compartilhe este código com ninguém. O AgroColetivo nunca pedirá este código por mensagem de texto, telefone ou email adicional.
      </div>
      
      <p>Se você não se cadastrou no AgroColetivo, ignore este email.</p>
    </div>
    
    <div class="footer">
      <p>© 2026 AgroColetivo. Todos os direitos reservados.</p>
      <p><strong>Oxentech Software</strong> | Soluções Agrícolas Inteligentes</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export default {
  sendVerificationEmail,
  getVerificationEmailTemplate,
};
