/**
 * Email Server - Envia emails via SMTP Gmail
 * Execute: node email-server.cjs
 *
 * Fornece endpoint HTTP POST /api/send-verification-email
 * que pode ser chamado do frontend/backend
 */

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.EMAIL_SERVER_PORT || 3001;

app.use(express.json());
app.use(cors());

// ── Criar transportador Gmail ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, ""),
  },
});

// ── Endpoint: Enviar email de verificação ───────────────────────────────────
app.post("/api/send-verification-email", async (req, res) => {
  try {
    const { email, name, code } = req.body;

    // Validar input
    if (!email || !name || !code) {
      return res.status(400).json({ error: "Email, name, and code required" });
    }

    // Enviar email
    const result = await transporter.sendMail({
      from: `AgroColetivo <${process.env.GMAIL_USER}>`,
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
              <div class="footer">
                <p>© 2026 AgroColetivo. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`✅ Email enviado para ${email} - ID: ${result.messageId}`);

    res.json({
      success: true,
      messageId: result.messageId,
      message: "Email enviado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error.message);

    res.status(500).json({
      success: false,
      error: error.message || "Erro ao enviar email",
    });
  }
});

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "email-server" });
});

// ── Iniciar servidor ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Email Server rodando em http://localhost:${PORT}`);
  console.log(
    `📧 Endpoint: POST http://localhost:${PORT}/api/send-verification-email`,
  );
});
