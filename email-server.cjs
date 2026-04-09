/**
 * Email Server - Envia emails via SMTP Gmail
 * Execute: node email-server.cjs
 *
 * Fornece endpoint HTTP POST /api/send-verification-email
 * e POST /api/send-login-alert-email
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

function buildCodeEmailHtml({
  title,
  headingColor,
  name,
  intro,
  code,
  expires,
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: ${headingColor}; margin: 0; }
          .code {
            font-size: 48px;
            font-weight: bold;
            text-align: center;
            color: ${headingColor};
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
            <h1>${title}</h1>
          </div>
          <p>Olá ${name},</p>
          <p>${intro}</p>
          <div class="code">${code}</div>
          <p>Este código expira em ${expires}.</p>
          <div class="footer">
            <p>© 2026 HubCompras. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ── Endpoint: Enviar email de verificação ───────────────────────────────────
app.post("/api/send-verification-email", async (req, res) => {
  const startTime = Date.now();
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📨 [${new Date().toISOString()}] HANDLER INICIADO`);
  console.log(`   Método: ${req.method}`);
  console.log(`   Body: ${JSON.stringify(req.body)}`);
  console.log(`=`.repeat(80));

  try {
    const { email, name, code } = req.body;
    console.log(
      `📧 Email recebido: ${email}, Name: ${name}, Code: ${code ? "presente" : "FALTANDO"}`,
    );

    // Validar input
    if (!email || !name || !code) {
      console.log(`❌ Validação falhou: faltam campos`);
      return res.status(400).json({ error: "Email, name, and code required" });
    }
    console.log("✅ Validação passou");

    console.log(`📤 Conectando ao SMTP do Gmail...`);
    // Enviar email
    const result = await transporter.sendMail({
      from: `HubCompras <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "✉️ Confirme seu email - HubCompras",
      html: buildCodeEmailHtml({
        title: "Bem-vindo ao HubCompras!",
        headingColor: "#4CAF50",
        name,
        intro: "Seu código de verificação é:",
        code,
        expires: "24 horas",
      }),
    });

    console.log(`✅ Email aceito pelo Gmail (MessageID: ${result.messageId})`);
    const duration = Date.now() - startTime;
    console.log(`✅ RESPOSTA SUCESSO (${duration}ms) - Serviço: gmail`);

    res.json({
      success: true,
      service: "gmail",
      messageId: result.messageId,
      message: "Email enviado com sucesso",
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ ERRO (${duration}ms):`);
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);

    res.status(500).json({
      success: false,
      error: error.message || "Erro ao enviar email",
    });
  }
});

// ── Endpoint: Enviar email de recuperação de senha ──────────────────────────
app.post("/api/send-password-recovery-email", async (req, res) => {
  const startTime = Date.now();
  console.log(`\n${"=".repeat(80)}`);
  console.log(
    `🔐 [${new Date().toISOString()}] PASSWORD RECOVERY HANDLER INICIADO`,
  );
  console.log(`   Método: ${req.method}`);
  console.log(`   Body: ${JSON.stringify(req.body)}`);
  console.log(`=`.repeat(80));

  try {
    const { email, name, code } = req.body;
    console.log(
      `📧 Recovery email recebido: ${email}, Name: ${name}, Code: ${code ? "presente" : "FALTANDO"}`,
    );

    if (!email || !name || !code) {
      console.log("❌ Validação falhou: faltam campos");
      return res.status(400).json({ error: "Email, name, and code required" });
    }

    const result = await transporter.sendMail({
      from: `HubCompras <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "🔐 Redefinir sua senha - HubCompras",
      html: buildCodeEmailHtml({
        title: "Recuperação de Senha",
        headingColor: "#d97706",
        name,
        intro: "Seu código para redefinir a senha é:",
        code,
        expires: "15 minutos",
      }),
    });

    console.log(
      `✅ Email de recuperação aceito pelo Gmail (MessageID: ${result.messageId})`,
    );
    const duration = Date.now() - startTime;
    console.log(`✅ RESPOSTA SUCESSO (${duration}ms) - Serviço: gmail`);

    res.json({
      success: true,
      service: "gmail",
      messageId: result.messageId,
      message: "Email de recuperação enviado com sucesso",
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ ERRO (${duration}ms):`);
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);

    res.status(500).json({
      success: false,
      error: error.message || "Erro ao enviar email de recuperação",
    });
  }
});

// ── Endpoint: Enviar email de aviso de login ─────────────────────────────────
app.post("/api/send-login-alert-email", async (req, res) => {
  try {
    const { email, name, details } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const safeName = typeof name === "string" && name.trim() ? name : "Usuário";
    const safeDetails = typeof details === "object" && details ? details : {};
    const when = safeDetails.timestamp
      ? new Date(safeDetails.timestamp).toLocaleString("pt-BR")
      : new Date().toLocaleString("pt-BR");

    const result = await transporter.sendMail({
      from: `HubCompras <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "🔐 Novo login na sua conta - HubCompras",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 24px; }
              .header h1 { color: #2c5f2d; margin: 0; }
              .card { background: #f4f8f4; border-left: 4px solid #2c5f2d; border-radius: 6px; padding: 16px; margin: 20px 0; }
              .warning { background: #fff4e5; border-left: 4px solid #ff9800; border-radius: 6px; padding: 14px; margin-top: 16px; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 24px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Aviso de Login</h1>
              </div>
              <p>Olá ${safeName},</p>
              <p>Detectamos um novo acesso à sua conta no HubCompras.</p>

              <div class="card">
                <p><strong>Data e hora:</strong> ${when}</p>
                <p><strong>Dispositivo:</strong> ${safeDetails.platform || "Desconhecido"}</p>
                <p><strong>Navegador:</strong> ${safeDetails.userAgent || "Desconhecido"}</p>
              </div>

              <div class="warning">
                <strong>Não foi você?</strong> Recomendamos alterar sua senha imediatamente.
              </div>

              <div class="footer">
                <p>© 2026 HubCompras. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log(
      `✅ Email de aviso de login enviado para ${email} - ID: ${result.messageId}`,
    );

    res.json({
      success: true,
      service: "gmail",
      messageId: result.messageId,
      message: "Email de aviso de login enviado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao enviar email de aviso de login:", error.message);

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
  console.log(
    `📧 Endpoint: POST http://localhost:${PORT}/api/send-password-recovery-email`,
  );
  console.log(
    `📧 Endpoint: POST http://localhost:${PORT}/api/send-login-alert-email`,
  );
});
