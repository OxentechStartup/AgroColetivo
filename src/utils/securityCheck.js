// Script para validar segurança - execute no DevTools do navegador
import runAllSecurityTests from "./utils/securityTests.js";

// Executa testes e valida
async function validateSecurity() {
  console.clear();
  console.log(
    "%c🔐 VALIDAÇÃO DE SEGURANÇA - AgroColetivo",
    "font-size: 16px; font-weight: bold; color: #16A34A",
  );

  const results = runAllSecurityTests();

  // Salva resultados
  window.securityResults = results;

  return results;
}

// Valida se o app está seguro
function checkSecurityStatus() {
  console.log("\n🔍 VERIFICAÇÃO DE STATUS DE SEGURANÇA\n");

  // 1. Verifica .env
  if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.log("✅ Supabase configurado via variáveis de ambiente");
  } else {
    console.log("⚠️ AVISO: Supabase pode não estar configurado");
  }

  // 2. Verifica localStorage/sessionStorage
  const keys = Object.keys(localStorage)
    .concat(Object.keys(sessionStorage))
    .filter(
      (k) =>
        k.toLowerCase().includes("password") ||
        k.toLowerCase().includes("secret"),
    );

  if (keys.length > 0) {
    console.log("🚨 CRÍTICO: Dados sensíveis encontrados no storage!");
    console.log("   Chaves afetadas:", keys);
  } else {
    console.log("✅ Nenhum dado sensível encontrado no storage");
  }

  // 3. Verifica HTTPS em produção
  if (window.location.protocol === "https:") {
    console.log("✅ Conexão segura (HTTPS)");
  } else if (window.location.hostname === "localhost") {
    console.log("ℹ️ Ambiente de desenvolvimento (HTTP permitido)");
  } else {
    console.log("🚨 CRÍTICO: Produção sem HTTPS!");
  }

  // 4. Verifica headers de segurança
  const headerInfo = {};
  const securityHeaders = [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "X-XSS-Protection",
    "Strict-Transport-Security",
    "Content-Security-Policy",
  ];

  console.log("\n📋 Headers de Segurança:");
  securityHeaders.forEach((header) => {
    const value =
      document.querySelector('meta[http-equiv="' + header + '"]')?.content ||
      "não encontrado";
    console.log(
      `   ${header}: ${value !== "não encontrado" ? "✅" : "⚠️"} ${value}`,
    );
  });
}

// Exporta para uso
export { validateSecurity, checkSecurityStatus, runAllSecurityTests };

// Executa automaticamente em desenvolvimento
if (import.meta.env.DEV) {
  console.log(
    "%c🔐 Modo Desenvolvimento Ativado",
    "color: orange; font-weight: bold",
  );
  console.log("Execute no console: validateSecurity() para rodar testes");
}
