/**
 * Keep-Alive Script for Onrender
 * Faz requisições periódicas ao site para evitar cold start
 * Execute com: node keep-alive.js
 */

const https = require("https");

const SITE_URL = "https://agrocoletivo.onrender.com";
const INTERVAL_MINUTES = 4; // A cada 4 minutos (mais agressivo)
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

function keepAlive() {
  https
    .get(SITE_URL, (res) => {
      console.log(
        `[${new Date().toISOString()}] Keep-alive ping: ${res.statusCode}`,
      );
    })
    .on("error", (err) => {
      console.error(
        `[${new Date().toISOString()}] Erro no keep-alive:`,
        err.message,
      );
    });
}

// Executa imediatamente
console.log(`🔄 Keep-alive iniciado - ping a cada ${INTERVAL_MINUTES} minutos`);
keepAlive();

// Executa periodicamente
setInterval(keepAlive, INTERVAL_MS);

// Mantém o processo rodando
process.on("SIGINT", () => {
  console.log("\n✋ Keep-alive parado");
  process.exit(0);
});
