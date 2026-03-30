/**
 * Production Server para Render
 * Serve os arquivos estáticos do Vite build
 */
import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Carregar variáveis de ambiente apenas em desenvolvimento
// Em produção (Render), as variáveis vêm do Render Dashboard
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

import sendVerificationEmailHandler from "./api/send-verification-email.js";
import sendLoginAlertEmailHandler from "./api/send-login-alert-email.js";
import {
  handleSendOrderEmail,
  handleSendProposalEmail,
  handleSendProposalReceivedEmail,
} from "./api/send-notification-emails.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, "dist");

// Middleware
app.use(express.json());
app.use(express.static(distPath));

// Health check endpoint
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Debug endpoint para diagnosticar problemas (DEV/PROD)
app.get("/api/debug", (req, res) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const sendgridKey = process.env.SENDGRID_API_KEY;

  res.json({
    status: "🟢 Server OK",
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || "development",
      PORT: process.env.PORT || 3000,
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
      email: {
        hasGmailUser: !!gmailUser,
        gmailUserValue: gmailUser ? `${gmailUser.substring(0, 5)}***` : "NÃO CONFIGURADO",
        hasGmailPassword: !!gmailPass,
        gmailPasswordLength: gmailPass ? gmailPass.replace(/\s/g, "").length : 0,
        hasSendgridKey: !!sendgridKey,
        sendgridKeyLength: sendgridKey ? sendgridKey.length : 0,
      },
    },
    server: {
      uptime: process.uptime(),
      memoryUsage: {
        heapUsed:
          Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
        heapTotal:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
      },
      distPath: distPath,
      distExists: fs.existsSync(distPath),
      indexExists: fs.existsSync(path.join(distPath, "index.html")),
    },
  });
});

// Email verification endpoint
app.post("/api/send-verification-email", sendVerificationEmailHandler);
app.options("/api/send-verification-email", sendVerificationEmailHandler);

// Login alert email endpoint
app.post("/api/send-login-alert-email", sendLoginAlertEmailHandler);
app.options("/api/send-login-alert-email", sendLoginAlertEmailHandler);

// Notification email endpoints
app.post("/api/send-order-email", handleSendOrderEmail);
app.options("/api/send-order-email", handleSendOrderEmail);

app.post("/api/send-proposal-email", handleSendProposalEmail);
app.options("/api/send-proposal-email", handleSendProposalEmail);

app.post("/api/send-proposal-received-email", handleSendProposalReceivedEmail);
app.options(
  "/api/send-proposal-received-email",
  handleSendProposalReceivedEmail,
);

// SPA fallback: retorna index.html para rotas não encontradas
app.use((req, res) => {
  const indexPath = path.join(distPath, "index.html");

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`✅ SERVIDOR INICIADO COM SUCESSO`);
  console.log(`=`.repeat(80));
  console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
  console.log(`📁 Dist path: ${distPath}`);
  console.log(
    `📦 Status arquivos estáticos: ${fs.existsSync(distPath) ? "✅ OK" : "❌ FALTANDO"}`,
  );
  console.log(
    `📄 Index.html: ${fs.existsSync(path.join(distPath, "index.html")) ? "✅ OK" : "❌ FALTANDO"}`,
  );
  console.log(`\n🔐 Configuração:`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `   Supabase: ${process.env.VITE_SUPABASE_URL ? "✅" : "⚠️ não configurado"}`,
  );
  console.log(
    `   Gmail User: ${process.env.GMAIL_USER ? "✅" : "⚠️ não configurado"}`,
  );
  console.log(
    `   Gmail Password: ${process.env.GMAIL_APP_PASSWORD ? "✅" : "⚠️ não configurado"}`,
  );
  console.log(`\n📊 Sistema:`);
  console.log(
    `   Memória: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
  );
  console.log(`   Node.js: ${process.version}`);
  console.log(`${"=".repeat(80)}\n`);
});
