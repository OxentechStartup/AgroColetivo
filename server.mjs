/**
 * Production Server para Render
 * Serve os arquivos estáticos do Vite build
 */
import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Carregar variáveis de ambiente
dotenv.config();

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
  res.json({
    status: "✅ Server OK",
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || "development",
      PORT: process.env.PORT || 3000,
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
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
  console.log(`\n📊 Sistema:`);
  console.log(
    `   Memória: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
  );
  console.log(`   Node.js: ${process.version}`);
  console.log(`${"=".repeat(80)}\n`);
});
