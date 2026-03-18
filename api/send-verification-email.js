/**
 * Vercel Serverless Function — /api/send-verification-email
 * Mesma lógica do email-server.cjs, mas no formato do Vercel.
 *
 * Variáveis de ambiente no Vercel (Settings → Environment Variables):
 *   GMAIL_USER         = oxentech.startup@gmail.com
 *   GMAIL_APP_PASSWORD = dlskwqszofvtdfsz
 */

const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, name, code } = req.body;

  if (!email || !name || !code) {
    return res.status(400).json({ error: "Email, name e code são obrigatórios" });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

  if (!gmailUser || !gmailPass) {
    console.error("GMAIL_USER ou GMAIL_APP_PASSWORD não configurados");
    return res.status(500).json({ error: "Servidor de email não configurado" });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  try {
    const result = await transporter.sendMail({
      from: `AgroColetivo <${gmailUser}>`,
      to: email,
      subject: "✉️ Confirme seu email - AgroColetivo",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #4CAF50; margin: 0; }
              .code {
                font-size: 48px;
                font-weight: bold;
                text-align: center;
                color: #4CAF50;
                letter-spacing: 8px;
                margin: 30px 0;
                padding: 20px;
                background: #f0f0f0;
                border-radius: 8px;
              }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Bem-vindo ao AgroColetivo!</h1>
              </div>
              <p>Olá ${name},</p>
              <p>Seu código de verificação é:</p>
              <div class="code">${code}</div>
              <p>Este código expira em 24 horas.</p>
              <p>Se você não criou uma conta, ignore este email.</p>
              <div class="footer">
                <p>© 2026 AgroColetivo. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`✅ Email enviado para ${email} — ID: ${result.messageId}`);

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
      message: "Email enviado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao enviar email",
    });
  }
};
