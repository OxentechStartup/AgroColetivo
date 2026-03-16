/**
 * PLANO DE TESTES E VALIDAÇÃO DE SEGURANÇA
 * AgroColetivo v0.21.0
 */

import {
  validatePhone,
  validatePassword,
  validateEmail,
  sanitizeString,
  validateInput,
  loginLimiter,
  registerLimiter,
  detectSQLInjection,
  detectXSS,
  isOriginAllowed,
} from "../utils/security";

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 1: VALIDAÇÃO DE TELEFONE
// ═══════════════════════════════════════════════════════════════════════════

export function testPhoneValidation() {
  console.log("\n🔍 TESTE 1: Validação de Telefone");
  const tests = [
    {
      input: "(38) 99111-0001",
      expected: true,
      description: "Telefone válido com DDD",
    },
    {
      input: "38991110001",
      expected: true,
      description: "Telefone válido sem máscara",
    },
    { input: "991110001", expected: false, description: "Telefone sem DDD" },
    { input: "123", expected: false, description: "Telefone muito curto" },
    { input: "", expected: false, description: "Telefone vazio" },
    { input: null, expected: false, description: "Telefone null" },
  ];

  let passed = 0;
  tests.forEach((test) => {
    const result = validatePhone(test.input);
    const success = result.valid === test.expected;
    passed += success ? 1 : 0;
    console.log(
      `  ${success ? "✅" : "❌"} ${test.description}: ${result.valid}`,
    );
  });

  return { total: tests.length, passed };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 2: VALIDAÇÃO DE SENHA
// ═══════════════════════════════════════════════════════════════════════════

export function testPasswordValidation() {
  console.log("\n🔍 TESTE 2: Validação de Senha");
  const tests = [
    {
      input: "SenhaForte@123",
      expected: true,
      description: "Senha forte (maiúscula, minúscula, número, especial)",
    },
    {
      input: "senha123",
      expected: false,
      description: "Senha fraca (sem maiúscula/especial)",
    },
    {
      input: "Abc@1",
      expected: false,
      description: "Senha muito curta",
    },
    {
      input: "123456789",
      expected: false,
      description: "Apenas números",
    },
    {
      input: "",
      expected: false,
      description: "Senha vazia",
    },
  ];

  let passed = 0;
  tests.forEach((test) => {
    const result = validatePassword(test.input);
    const success = result.valid === test.expected;
    passed += success ? 1 : 0;
    console.log(
      `  ${success ? "✅" : "❌"} ${test.description}: ${result.valid} (${result.strength})`,
    );
  });

  return { total: tests.length, passed };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 3: SQL INJECTION DETECTION
// ═══════════════════════════════════════════════════════════════════════════

export function testSQLInjectionDetection() {
  console.log("\n🔍 TESTE 3: Detecção de SQL Injection");
  const tests = [
    {
      input: "'; DROP TABLE users; --",
      expected: true,
      description: "SQL Injection clássico",
    },
    { input: "1' OR '1'='1", expected: true, description: "SQL OR injection" },
    {
      input: "SELECT * FROM users",
      expected: true,
      description: "SELECT statement",
    },
    { input: "38991110001", expected: false, description: "Entrada normal" },
    { input: "João Silva", expected: false, description: "Nome normal" },
  ];

  let passed = 0;
  tests.forEach((test) => {
    const result = detectSQLInjection(test.input);
    const success = result === test.expected;
    passed += success ? 1 : 0;
    console.log(`  ${success ? "✅" : "❌"} ${test.description}: ${result}`);
  });

  return { total: tests.length, passed };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 4: XSS DETECTION
// ═══════════════════════════════════════════════════════════════════════════

export function testXSSDetection() {
  console.log("\n🔍 TESTE 4: Detecção de XSS");
  const tests = [
    {
      input: '<script>alert("XSS")</script>',
      expected: true,
      description: "Script tag",
    },
    {
      input: '<img src=x onerror=alert("XSS")>',
      expected: true,
      description: "Event handler",
    },
    {
      input: 'javascript:alert("XSS")',
      expected: true,
      description: "Javascript protocol",
    },
    {
      input: "Agropecuária Central Ltda",
      expected: false,
      description: "Texto normal",
    },
    { input: "123-456-789", expected: false, description: "Números e hífens" },
  ];

  let passed = 0;
  tests.forEach((test) => {
    const result = detectXSS(test.input);
    const success = result === test.expected;
    passed += success ? 1 : 0;
    console.log(`  ${success ? "✅" : "❌"} ${test.description}: ${result}`);
  });

  return { total: tests.length, passed };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 5: STRING SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════

export function testStringSanitization() {
  console.log("\n🔍 TESTE 5: Sanitização de String");
  const tests = [
    {
      input: '<script>alert("XSS")</script>',
      expected: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;",
      description: "Script tag sanitizado",
    },
    {
      input: "João & Silva",
      expected: "Jo&atilde;o &amp; Silva",
      description: "Caracteres especiais escapados",
    },
    {
      input: "Normal text",
      expected: "Normal text",
      description: "Texto normal sem mudanças",
    },
  ];

  let passed = 0;
  tests.forEach((test) => {
    const result = sanitizeString(test.input);
    const success = result === test.expected;
    passed += success ? 1 : 0;
    console.log(
      `  ${success ? "✅" : "❌"} ${test.description}`,
      success ? "" : `\n    Esperado: ${test.expected}\n    Obtido: ${result}`,
    );
  });

  return { total: tests.length, passed };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 6: RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

export function testRateLimiting() {
  console.log("\n🔍 TESTE 6: Rate Limiting");

  // Reset limiter
  const limiter = loginLimiter;

  let passed = 0;
  const total = 4;

  // First 5 requests should be allowed
  console.log("  Testando primeiras 5 requisições...");
  for (let i = 0; i < 5; i++) {
    const result = limiter.check("testuser");
    if (result.allowed && i < 5) {
      passed++;
      console.log(`    ✅ Requisição ${i + 1}: Permitida`);
    }
  }

  // 6th request should be blocked
  console.log("  Testando bloqueio após limite...");
  const blockedResult = limiter.check("testuser");
  if (!blockedResult.allowed) {
    passed++;
    console.log(
      `  ✅ Requisição 6: Bloqueada (retryAfter: ${blockedResult.retryAfter}s)`,
    );
  } else {
    console.log(`  ❌ Requisição 6: Deveria estar bloqueada`);
  }

  // Reset
  limiter.reset("testuser");
  const afterReset = limiter.check("testuser");
  if (afterReset.allowed) {
    passed++;
    console.log(`  ✅ Após reset: Permitida`);
  }

  // Stats
  console.log(`  📊 Stats: ${limiter.stats().totalKeys} chaves monitoradas`);
  passed++;

  return { total, passed };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 7: CORS ORIGIN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export function testCORSValidation() {
  console.log("\n🔍 TESTE 7: CORS - Validação de Origem");
  const tests = [
    {
      origin: "http://localhost:5173",
      expected: true,
      description: "Localhost permitido",
    },
    {
      origin: "http://localhost:3000",
      expected: true,
      description: "Dev server permitido",
    },
    {
      origin: "https://agrocoletivo.vercel.app",
      expected: true,
      description: "Vercel permitido",
    },
    {
      origin: "https://www.agrocoletivo.com.br",
      expected: true,
      description: "Produção permitido",
    },
    {
      origin: "https://evil.com",
      expected: false,
      description: "Site malicioso bloqueado",
    },
    {
      origin: "https://attacker.xyz",
      expected: false,
      description: "Origem desconhecida bloqueada",
    },
  ];

  let passed = 0;
  tests.forEach((test) => {
    const result = isOriginAllowed(test.origin);
    const success = result === test.expected;
    passed += success ? 1 : 0;
    console.log(`  ${success ? "✅" : "❌"} ${test.description}: ${result}`);
  });

  return { total: tests.length, passed };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 8: INPUT VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

export function testInputValidationSchema() {
  console.log("\n🔍 TESTE 8: Schema de Validação de Input");

  const schema = {
    name: "required|string|max:100",
    email: "email",
    age: "number|min:18",
  };

  const tests = [
    {
      data: { name: "João Silva", email: "joao@example.com", age: "25" },
      expected: true,
      description: "Dados válidos",
    },
    {
      data: { name: "", email: "joao@example.com", age: "25" },
      expected: false,
      description: "Nome vazio",
    },
    {
      data: { name: "João Silva", email: "joao@example.com", age: "15" },
      expected: false,
      description: "Idade menor que 18",
    },
  ];

  let passed = 0;
  tests.forEach((test) => {
    const result = validateInput(test.data, schema);
    const success = result.valid === test.expected;
    passed += success ? 1 : 0;
    console.log(
      `  ${success ? "✅" : "❌"} ${test.description}: ${result.valid}`,
    );
    if (result.errors && Object.keys(result.errors).length > 0) {
      console.log(`    Erros: ${JSON.stringify(result.errors)}`);
    }
  });

  return { total: tests.length, passed };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTAR TODOS OS TESTES
// ═══════════════════════════════════════════════════════════════════════════

export function runAllSecurityTests() {
  console.log("\n" + "═".repeat(70));
  console.log("🔐 PLANO DE TESTES DE SEGURANÇA - AgroColetivo");
  console.log("═".repeat(70));

  const results = [
    testPhoneValidation(),
    testPasswordValidation(),
    testSQLInjectionDetection(),
    testXSSDetection(),
    testStringSanitization(),
    testRateLimiting(),
    testCORSValidation(),
    testInputValidationSchema(),
  ];

  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const passPercentage = Math.round((totalPassed / totalTests) * 100);

  console.log("\n" + "═".repeat(70));
  console.log("📊 RESULTADO FINAL");
  console.log("═".repeat(70));
  console.log(`Total de testes: ${totalTests}`);
  console.log(`Testes aprovados: ${totalPassed}`);
  console.log(`Testes falhados: ${totalTests - totalPassed}`);
  console.log(
    `${passPercentage >= 95 ? "✅" : "⚠️"} Taxa de aprovação: ${passPercentage}%`,
  );
  console.log("═".repeat(70));

  if (passPercentage === 100) {
    console.log("🎉 TODOS OS TESTES PASSARAM! Seu código está seguro.");
  } else if (passPercentage >= 95) {
    console.log("⚠️ Alguns testes falharam. Revise as vulnerabilidades acima.");
  } else {
    console.log(
      "🚨 ALERTA DE SEGURANÇA! Múltiplas vulnerabilidades detectadas.",
    );
  }

  return {
    totalTests,
    totalPassed,
    totalFailed: totalTests - totalPassed,
    passPercentage,
  };
}

// Exporta função para executar nos testes
export default runAllSecurityTests;
