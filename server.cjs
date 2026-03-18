/**
 * Production Server para Render
 * Serve os arquivos estáticos do Vite build
 */
const express = require("express");
const path = require("path");
const fs = require("fs");

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
  console.log(`✅ Servidor rodando em http://0.0.0.0:${PORT}`);
  console.log(`📁 Servindo arquivos de: ${distPath}`);
});
