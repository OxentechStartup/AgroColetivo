/**
 * Password Reset Endpoint — /api/reset-password
 *
 * Valida código de recuperação de senha e atualiza a senha na Supabase Auth
 * Este endpoint foi criado porque o frontend não tem permissão para chamar
 * auth.admin.updateUserById() (apenas backend pode fazer isso)
 *
 * Fluxo:
 * 1. Frontend valida código em email_verifications table
 * 2. Frontend chama este endpoint com email, código e nova senha
 * 3. Backend valida novamente por segurança
 * 4. Backend usa admin API para atualizar senha
 * 5. Backend marca código como usado
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // CORS
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "https://agro-coletivo.vercel.app",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean);

  const origin = req.headers.origin || req.headers.referer?.split("/")[2];
  if (origin && allowedOrigins.some((a) => origin.includes(a))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { email, code, newPassword } = req.body || {};

    // ── 1. VALIDAÇÕES ────────────────────────────────────────────────────────
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        error: "Email, código e nova senha são obrigatórios",
      });
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        error: "Código de verificação inválido",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Senha deve ter no mínimo 6 caracteres",
      });
    }

    // ── 2. BUSCAR USUÁRIO ────────────────────────────────────────────────────
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      // Não revelar se email existe
      console.log(`⚠️ Reset password: email não encontrado: ${email}`);
      return res.status(200).json({
        success: true,
        message: "Se este email existe, a senha foi redefinida",
      });
    }

    // ── 3. VALIDAR CÓDIGO ────────────────────────────────────────────────────
    const { data: verification, error: verError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("code", code)
      .maybeSingle();

    if (!verification) {
      console.log(`⚠️ Reset password: código inválido para ${email}`);
      return res.status(400).json({
        error: "Código de verificação inválido",
      });
    }

    if (verification.verified) {
      console.log(`⚠️ Reset password: código já foi usado para ${email}`);
      return res.status(400).json({
        error: "Este código já foi utilizado",
      });
    }

    if (Date.now() > new Date(verification.expires_at).getTime()) {
      console.log(`⚠️ Reset password: código expirado para ${email}`);
      return res.status(400).json({
        error: "Código de verificação expirado. Solicite um novo",
      });
    }

    // ── 4. ATUALIZAR SENHA (ADMIN API) ───────────────────────────────────────
    try {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword },
      );

      if (updateError) {
        console.error(
          `❌ Erro ao atualizar senha para ${email}:`,
          updateError.message,
        );
        return res.status(500).json({
          error: updateError.message || "Erro ao redefinir senha",
        });
      }
    } catch (error) {
      console.error(`❌ Erro fatal ao atualizar senha:`, error.message);
      return res.status(500).json({
        error: "Erro ao redefinir senha. Tente novamente.",
      });
    }

    // ── 5. MARCAR CÓDIGO COMO USADO ──────────────────────────────────────────
    await supabase
      .from("email_verifications")
      .update({ verified: true })
      .eq("id", verification.id)
      .catch((err) => console.error("Erro ao marcar código como usado:", err));

    console.log(`✅ Senha redefinida com sucesso para ${email}`);

    return res.status(200).json({
      success: true,
      message: "Senha alterada com sucesso! Você pode fazer login agora.",
    });
  } catch (error) {
    console.error("❌ ERRO FATAL:", error.message);
    return res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Erro ao redefinir senha"
          : error.message,
    });
  }
}
