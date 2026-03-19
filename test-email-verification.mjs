/**
 * Script de teste: Fluxo completo de registro e verificação de email
 * Executa: node test-email-verification.mjs
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

async function testEmailVerification() {
  const testEmail = `teste-${Date.now()}@test.com`;
  const testPassword = "TestPass123!";
  const testRole = "vendor"; // Roles válidos: 'admin', 'pivo', 'vendor', 'buyer'

  console.log("\n" + "=".repeat(60));
  console.log("🧪 TESTE DE VERIFICAÇÃO DE EMAIL");
  console.log("=".repeat(60));

  try {
    // STEP 1: Criar registro pendente (simula register())
    console.log("\n📝 STEP 1: Criando registro pendente...");
    console.log(`   Email: ${testEmail}`);

    const verificationCode = Math.random().toString().slice(2, 8);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from("pending_registrations")
      .insert({
        email: testEmail,
        password_hash: testPassword,
        name: "Teste User",
        phone: "1234567890",
        role: testRole,
        verification_code: verificationCode,
        expires_at: expiresAt,
      })
      .select("id");

    if (insertError) {
      console.error("❌ Erro ao inserir:", insertError);
      return;
    }

    console.log("✅ Registro inserido com sucesso");

    // STEP 2: Buscar o ID do registro
    console.log("\n🔍 STEP 2: Buscando ID do registro pendente...");

    const { data: pending, error: fetchError } = await supabase
      .from("pending_registrations")
      .select("id")
      .eq("email", testEmail)
      .maybeSingle();

    console.log("   Resultado da query:", { pending, fetchError });

    if (fetchError || !pending) {
      console.error("❌ Erro ao buscar ID:", fetchError);
      console.error("❌ Registro não encontrado!");
      return;
    }

    const pendingId = pending.id;
    console.log(`✅ ID encontrado: ${pendingId}`);
    console.log(`📧 Código de verificação: ${verificationCode}`);

    // STEP 3: Tentar verificar o email
    console.log("\n✔️ STEP 3: Verificando email...");
    console.log(`   pendingId: ${pendingId}`);
    console.log(`   code: ${verificationCode}`);

    // Buscar o registro pendente
    const { data: pendingData, error: pendingError } = await supabase
      .from("pending_registrations")
      .select("*")
      .eq("id", pendingId)
      .maybeSingle();

    if (pendingError) {
      console.error("❌ Erro ao buscar registro pendente:", pendingError);
      return;
    }

    if (!pendingData) {
      console.error("❌ Registro pendente não encontrado!");
      return;
    }

    console.log("✅ Registro pendente encontrado");

    // Verificar código
    if (pendingData.verification_code !== verificationCode) {
      console.error(
        `❌ Código incorreto! Esperado: ${pendingData.verification_code}, Recebido: ${verificationCode}`,
      );
      return;
    }

    console.log("✅ Código válido");

    // Verificar expiração
    if (Date.now() > new Date(pendingData.expires_at).getTime()) {
      console.error("❌ Código expirado!");
      return;
    }

    console.log("✅ Código não expirado");

    // Verificar se email já foi cadastrado
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", testEmail)
      .maybeSingle();

    if (existingUser) {
      console.log("⚠️  Email já cadastrado, limpando...");
      await supabase.from("pending_registrations").delete().eq("id", pendingId);
      return;
    }

    // Criar usuário em `users`
    console.log("\n👤 STEP 4: Criando usuário em 'users'...");

    const newId = crypto.randomUUID();
    const { error: insertUserError } = await supabase.from("users").insert({
      id: newId,
      email: testEmail,
      name: pendingData.name,
      phone: pendingData.phone,
      role: pendingData.role,
      password_hash: pendingData.password_hash,
      email_verified: true,
      active: true,
    });

    if (insertUserError) {
      console.error("❌ Erro ao criar usuário:", insertUserError);
      return;
    }

    console.log("✅ Usuário criado com sucesso!");

    // Limpar registro pendente
    console.log("\n🧹 STEP 5: Limpando registro pendente...");

    const { error: deleteError } = await supabase
      .from("pending_registrations")
      .delete()
      .eq("id", pendingId);

    if (deleteError) {
      console.error("⚠️  Erro ao deletar pendente:", deleteError);
    } else {
      console.log("✅ Registro pendente deletado");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ TESTE CONCLUÍDO COM SUCESSO!");
    console.log("=".repeat(60));
    console.log(`\n📊 Resultado:`);
    console.log(`   User ID: ${newId}`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Email verificado: SIM`);
  } catch (err) {
    console.error("\n❌ ERRO NÃO TRATADO:", err.message);
  }
}

testEmailVerification();
