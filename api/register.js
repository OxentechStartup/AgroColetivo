/**
 * ENDPOINT SEGURO DE REGISTRO
 * Usa SERVICE_ROLE_KEY para criar conta com permissões totais
 * Evita problemas de RLS/permissions no frontend
 */

import { ROLES } from "../src/constants/roles.js";
import { getSupabaseAdminClient } from "./_supabaseAdmin.js";

let supabaseAdminClient = null;

function getSupabaseAdmin() {
  if (supabaseAdminClient) return supabaseAdminClient;
  supabaseAdminClient = getSupabaseAdminClient();
  return supabaseAdminClient;
}

function generateVerificationCode() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCredentialValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeAlphaNum(value) {
  return normalizeCredentialValue(value).replace(/[^a-z0-9]/g, "");
}

function isPasswordBasedOnIdentity(password, identityCandidates = []) {
  const normalizedPassword = normalizeAlphaNum(password);
  if (!normalizedPassword) return false;

  return identityCandidates.some((candidate) => {
    const normalizedCandidate = normalizeAlphaNum(candidate);
    return (
      normalizedCandidate.length >= 3 &&
      normalizedCandidate === normalizedPassword
    );
  });
}

export default async function handler(req, res) {
  // CORS restritivo
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "https://agro-coletivo.vercel.app",
    "https://agrocoletivo.onrender.com",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean);

  const origin = req.headers.origin || req.headers.referer?.split("/")[2];
  if (origin && allowedOrigins.some((a) => origin.includes(a))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    let supabaseAdmin;
    try {
      supabaseAdmin = getSupabaseAdmin();
    } catch (configError) {
      console.error(
        "[register] Configuração Supabase faltando:",
        configError.message,
      );
      return res.status(503).json({
        error:
          "Serviço de registro temporariamente indisponível. Tente novamente mais tarde.",
        code: "SERVICE_UNAVAILABLE",
      });
    }

    const { email, password, role, name, phone, city, notes } = req.body;
    const cleanPhone = normalizePhoneDigits(phone);

    // Validações básicas
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email inválido" });
    }

    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ error: "Senha deve ter no mínimo 8 caracteres" });
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: "Telefone inválido" });
    }

    const identityCandidates = [
      name,
      email,
      String(email).split("@")[0],
      phone,
    ];

    if (isPasswordBasedOnIdentity(password, identityCandidates)) {
      return res.status(400).json({
        error: "A senha não pode ser igual ao nome, email ou telefone",
      });
    }

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: "Tipo de conta inválido" });
    }

    // Verificar se email já existe
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: "Email já cadastrado",
        message: "Este email já está registrado. Faça login.",
      });
    }

    // ✅ CRIAR CONTA NO SUPABASE AUTH (com service role)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          name: name || "Usuário",
          phone: cleanPhone,
          role,
          city: city || null,
          notes: notes || null,
        },
      });

    if (authError || !authData.user) {
      console.error("Auth error:", authError);
      const authMessage = String(authError?.message || "");
      const alreadyRegistered =
        authMessage.toLowerCase().includes("already") &&
        authMessage.toLowerCase().includes("registered");

      if (alreadyRegistered) {
        return res.status(409).json({
          error: "Email já cadastrado",
          message: "Este email já está registrado. Faça login.",
        });
      }

      return res.status(400).json({
        error: "Erro ao criar conta",
        message: authMessage || "Tente novamente",
      });
    }

    const userId = authData.user.id;

    // Crear registro na tabela users
    const { error: userError } = await supabaseAdmin.from("users").insert({
      id: userId,
      email,
      name: name || "Usuário",
      phone: cleanPhone,
      role,
      city: city || null,
      notes: notes || null,
      email_verified: false,
      active: true,
    });

    if (userError) {
      console.error("User record error:", userError);
      // Tentar deletar conta de auth criada
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (e) {
        console.error("Failed to cleanup auth user:", e);
      }
      return res.status(400).json({
        error: "Erro ao criar perfil",
        message: "Tente novamente",
      });
    }

    // Gerar código de verificação
    const verificationCode = generateVerificationCode();

    // Salvar código em email_verifications
    const { error: codeError } = await supabaseAdmin
      .from("email_verifications")
      .insert({
        user_id: userId,
        code: verificationCode,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      });

    if (codeError) {
      console.error("Code error:", codeError);
      return res.status(400).json({
        error: "Erro ao gerar código",
        message: "Tente novamente",
      });
    }

    return res.status(201).json({
      success: true,
      id: userId,
      email,
      message: "Conta criada! Verifique seu email para confirmar.",
      devCode:
        process.env.NODE_ENV === "development" ? verificationCode : undefined,
    });
  } catch (error) {
    console.error("Register endpoint error:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: error.message,
    });
  }
}
