/**
 * Script de teste: Verifica o que register() retorna
 * Executa: node test-register-return.mjs
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importar a função register do src/lib/auth.js é complicado porque é ESM e tem imports
// Vou recriar a lógica aqui para testar

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

function generateVerificationCode() {
  return Math.random().toString().slice(2, 8);
}

async function testRegisterLogic() {
  const testEmail = `teste-${Date.now()}@test.com`;
  const testPassword = "TestPass123!";
  const testRole = "vendor";
  const testName = "Test User";

  console.log("\n" + "=".repeat(60));
  console.log("🧪 TESTE: O que register() retorna?");
  console.log("=".repeat(60));
  console.log(`\nInputs:`);
  console.log(`  email: ${testEmail}`);
  console.log(`  role: ${testRole}`);
  console.log(`  name: ${testName}`);

  try {
    // STEP 1: Inserir em pending_registrations
    console.log("\n📝 STEP 1: Inserindo em pending_registrations...");

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: pendingError } = await supabase
      .from("pending_registrations")
      .upsert(
        {
          email: testEmail,
          password_hash: testPassword,
          name: testName,
          phone: "123456",
          role: testRole,
          city: null,
          notes: null,
          verification_code: verificationCode,
          expires_at: expiresAt,
        },
        { onConflict: "email" },
      );

    if (pendingError) {
      console.error("❌ Erro ao inserir:", pendingError);
      return;
    }
    console.log("✅ Inserido");

    // STEP 2: Buscar o ID (ISSO É O QUE FALTAVA?)
    console.log("\n🔍 STEP 2: Buscando o ID do registro...");

    const { data: pending, error: fetchError } = await supabase
      .from("pending_registrations")
      .select("id")
      .eq("email", testEmail)
      .maybeSingle();

    console.log("   Query result:");
    console.log("     pending:", pending);
    console.log("     fetchError:", fetchError);

    if (!pending || !pending.id) {
      console.error("❌ ID não encontrado ou é null!");
      console.error("   pending:", pending);
      console.error("   pending?.id:", pending?.id);
      return;
    }

    // STEP 3: Simular o retorno de register()
    console.log("\n📤 STEP 3: Simulando retorno de register()");

    const registerReturn = {
      id: pending?.id,
      email: testEmail,
      name: testName,
      requiresEmailVerification: true,
      emailSent: true,
      devCode: undefined,
      message: "Código de verificação enviado!",
    };

    console.log("\n🎯 O que register() vai retornar:");
    console.log(JSON.stringify(registerReturn, null, 2));

    // STEP 4: Simular o que useAuth.js vai fazer com isso
    console.log("\n💾 STEP 4: Simulando localStorage em useAuth.js");

    const pendingUser = {
      id: registerReturn.id,
      name: registerReturn.name,
      email: registerReturn.email,
      devCode: registerReturn.devCode,
      emailSent: registerReturn.emailSent,
    };

    const jsonString = JSON.stringify(pendingUser);
    console.log("\n  JSON a ser salvo:");
    console.log("  " + jsonString);

    console.log("\n  Ao recuperar:");
    const recovered = JSON.parse(jsonString);
    console.log("    recovered:", recovered);
    console.log("    recovered.id:", recovered.id);
    console.log("    typeof recovered.id:", typeof recovered.id);
    console.log("    !recovered.id:", !recovered.id);
    console.log("    recovered.id || '':", recovered.id || "");

    // Cleanup
    console.log("\n🧹 Limpando...");
    await supabase
      .from("pending_registrations")
      .delete()
      .eq("email", testEmail);

    console.log("\n" + "=".repeat(60));
    console.log("✅ TESTE CONCLUÍDO");
    console.log("=".repeat(60));
  } catch (err) {
    console.error("\n❌ ERRO:", err.message);
  }
}

testRegisterLogic();
