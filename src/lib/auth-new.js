/**
 * ✅ AUTENTICAÇÃO REFATORADA
 * Fluxo limpo usando schema EXISTENTE:
 * 1. REGISTRO → Email + Senha + Info → pending_registrations + Email de verificação
 * 2. VERIFICAR EMAIL → Código 6 dígitos → Cria conta Supabase + tabela users
 * 3. LOGIN → Email + Senha → Autentica direto
 * 4. SENHA PERDIDA → Email → Código 6 dígitos (em email_verifications) → Nova Senha
 *
 * Schema usado:
 * - pending_registrations: email, name, phone, role, city, notes, verification_code, expires_at
 * - users: id, email, email_verified, name, phone, role, city, notes, active, profile_photo_url
 * - vendors: user_id, name, phone, city
 * - email_verifications: user_id, code, expires_at, verified (reutilizado para password recovery)
 */

import { supabase } from "./supabase.js";
import { ROLES } from "../constants/roles.js";
import {
  validateEmail,
  validatePassword,
  loginLimiter,
  registerLimiter,
} from "../utils/security.js";
import { logSecurityEvent } from "./authorization.js";
import {
  sendVerificationEmail,
  sendPasswordRecoveryEmail,
  sendLoginAlertEmail,
} from "./n8n-client.js";

// ────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

function generateVerificationCode() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

const REGISTER_ENDPOINT_TIMEOUT_MS = 25000;
const LOGIN_TIMEOUT_MS = 28000;
const LOGIN_AUTH_STEP_TIMEOUT_MS = 8000;
const LOGIN_PROFILE_STEP_TIMEOUT_MS = 5000;

const USER_PROFILE_SELECT_FIELDS =
  "id, name, email, phone, role, city, notes, active, email_verified, profile_photo_url";

const INVALID_CREDENTIALS_MARKERS = [
  "invalid login credentials",
  "invalid_credentials",
  "email or password is incorrect",
  "email ou senha",
];

const EMAIL_NOT_CONFIRMED_MARKERS = [
  "email not confirmed",
  "email_not_confirmed",
  "email not verified",
  "signup disabled",
];

function isInvalidCredentialsMessage(message = "") {
  const normalized = String(message || "").toLowerCase();
  return INVALID_CREDENTIALS_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
}

function isEmailNotConfirmedMessage(message = "") {
  const normalized = String(message || "").toLowerCase();
  return EMAIL_NOT_CONFIRMED_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
}

function createLegacyMigrationError() {
  const err = new Error("LEGACY_USER_REQUIRES_MIGRATION");
  err.code = "LEGACY_USER";
  return err;
}

function createTimeoutError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
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

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
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

async function withTimeout(
  promiseFactory,
  timeoutMs,
  timeoutMessage,
  timeoutCode,
) {
  let timeoutId = null;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(createTimeoutError(timeoutMessage, timeoutCode));
      }, timeoutMs);
    });

    return await Promise.race([promiseFactory(), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function clearSupabaseAuthLocalState() {
  if (typeof localStorage === "undefined") return;
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key === "agrocoletivo_supabase_auth_v1" ||
        key.startsWith("sb-") ||
        key.includes("supabase-auth-token")
      ) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // noop
  }
}

async function signInWithPasswordDirect(email, password) {
  const supabaseUrl = String(import.meta.env?.VITE_SUPABASE_URL || "").replace(
    /\/+$/,
    "",
  );
  const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      data: null,
      error: {
        message: "Credenciais do Supabase ausentes para autenticação.",
      },
    };
  }

  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      data: null,
      error: {
        message:
          payload?.msg ||
          payload?.error_description ||
          payload?.error ||
          `Falha no Auth (${response.status})`,
      },
    };
  }

  const accessToken = payload?.access_token;
  const refreshToken = payload?.refresh_token;

  if (!accessToken || !refreshToken) {
    return {
      data: null,
      error: {
        message: "Sessão inválida retornada pelo Auth.",
      },
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth
    .setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    .catch((err) => ({ data: null, error: err }));

  if (sessionError) {
    return {
      data: null,
      error: {
        message: sessionError?.message || "Erro ao aplicar sessão local.",
      },
    };
  }

  const authUser =
    sessionData?.user || sessionData?.session?.user || payload?.user || null;

  return {
    data: {
      user: authUser,
    },
    error: null,
  };
}

function buildFallbackUserFromAuth(authUser, fallbackEmail) {
  if (!authUser?.id) return null;

  const meta = authUser.user_metadata || {};
  const email = authUser.email || fallbackEmail || "";
  const role = Object.values(ROLES).includes(meta.role)
    ? meta.role
    : ROLES.GESTOR;

  return {
    id: authUser.id,
    name:
      String(meta.name || meta.full_name || email.split("@")[0] || "Usuário")
        .trim()
        .slice(0, 120) || "Usuário",
    email,
    phone: String(meta.phone || "")
      .replace(/\D/g, "")
      .slice(0, 20),
    role,
    city: meta.city ? String(meta.city).slice(0, 120) : null,
    notes: meta.notes ? String(meta.notes).slice(0, 500) : null,
    active: true,
    email_verified: !!authUser.email_confirmed_at,
    profile_photo_url: meta.avatar_url || null,
  };
}

async function findUserByEmail(email) {
  const { data } = await supabase
    .from("users")
    .select("id, email, role, active, email_verified, password_hash")
    .eq("email", email)
    .maybeSingle();

  return data ?? null;
}

async function ensureUserProfileFromAuth(authUser, fallbackEmail) {
  if (!authUser?.id) return null;

  const meta = authUser.user_metadata || {};
  const authEmail = authUser.email || fallbackEmail;
  const role = Object.values(ROLES).includes(meta.role)
    ? meta.role
    : ROLES.GESTOR;
  const safeName =
    String(meta.name || meta.full_name || authEmail?.split("@")[0] || "Usuário")
      .trim()
      .slice(0, 120) || "Usuário";
  const safePhone = String(meta.phone || "")
    .replace(/\D/g, "")
    .slice(0, 20);

  const payload = {
    id: authUser.id,
    email: authEmail,
    name: safeName,
    phone: safePhone,
    role,
    city: meta.city ? String(meta.city).slice(0, 120) : null,
    notes: meta.notes ? String(meta.notes).slice(0, 500) : null,
    email_verified: !!authUser.email_confirmed_at,
    active: true,
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select(USER_PROFILE_SELECT_FIELDS)
    .single();

  if (error || !data) {
    return null;
  }

  if (data.role === ROLES.VENDOR) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", data.id)
      .maybeSingle();

    if (!vendor) {
      await supabase.from("vendors").insert({
        user_id: data.id,
        name: data.name,
        phone: data.phone || "",
        city: data.city || "",
        notes: data.notes || "",
      });
    }
  }

  return data;
}



export function getSession() {
  try {
    const session = localStorage.getItem("agro_auth_session");
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

export function saveSession(user) {
  localStorage.setItem("agro_auth_session", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("agro_auth_session");
  localStorage.removeItem("agro_pending_registration");
  localStorage.removeItem("agro_password_recovery");
}

async function registerViaClientFallback(email, password, role, extra = {}) {
  // Validate inputs before attempting signup
  if (!email || !email.includes("@")) {
    throw new Error("Email inválido");
  }
  if (!password || password.length < 6) {
    throw new Error("Senha deve ter pelo menos 6 caracteres");
  }

  const cleanPhone = normalizePhoneDigits(extra.phone);
  const safeName = extra.company_name?.trim() || "Usuário";

  // Build metadata with real user data
  const userMetadata = {
    name: safeName,
    phone: cleanPhone,
    role,
    city: extra.city?.trim() || null,
  };

  const signUpPayload = {
    email: email.toLowerCase().trim(),
    password,
    options: {
      data: userMetadata,
      emailRedirectTo: undefined, // Don't use Supabase email confirmation
    },
  };

  console.log("[auth] Registrando via fallback (signUp direto)");

  const { data: authData, error: authError } =
    await supabase.auth.signUp(signUpPayload);

  if (authError || !authData?.user) {
    console.error("[auth] Supabase signup error:", authError?.message);

    const msg = String(authError?.message || "");

    // Email já cadastrado
    if (
      msg.toLowerCase().includes("already") &&
      msg.toLowerCase().includes("registered")
    ) {
      throw new Error("Este email já está cadastrado. Faça login.");
    }

    if (
      msg.includes('null value in column "phone"') ||
      msg.toLowerCase().includes("database error saving new user") ||
      msg.toLowerCase().includes("invalid") ||
      msg.includes("500")
    ) {
      throw new Error(
        "Não foi possível completar o cadastro no momento. Verifique sua conexão e tente novamente em alguns minutos.",
      );
    }
    throw new Error(authError?.message || "Erro ao criar conta.");
  }

  const userId = authData.user.id;

  // Sincroniza dados na tabela users
  const { error: userError } = await supabase.from("users").upsert(
    {
      id: userId,
      email,
      name: safeName,
      phone: cleanPhone,
      role,
      city: extra.city?.trim() || null,
      notes: extra.notes?.trim() || null,
      email_verified: false,
      active: true,
    },
    { onConflict: "id" },
  );

  if (userError) {
    console.error("[auth] Erro ao criar perfil:", userError.message);
  }

  // Criar vendor se fornecedor
  if (role === ROLES.VENDOR) {
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingVendor) {
      await supabase.from("vendors").insert({
        user_id: userId,
        name: safeName,
        phone: cleanPhone,
        city: extra.city?.trim() || "",
        notes: extra.notes?.trim() || "",
      });
    }
  }

  const verificationCode = generateVerificationCode();
  const { error: codeError } = await supabase
    .from("email_verifications")
    .insert({
      user_id: userId,
      code: verificationCode,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      verified: false,
    });

  if (codeError) {
    console.error("[auth] Erro ao gerar código:", codeError.message);
    throw new Error("Erro ao gerar código de verificação.");
  }

  // Enviar email via N8N webhook
  let emailSent = false;
  try {
    await sendVerificationEmail(email, verificationCode, safeName);
    emailSent = true;
    console.log("✅ Email de verificação enviado via N8N para", email);
  } catch (emailErr) {
    console.warn("⚠️ Falha ao enviar email:", emailErr?.message);
    emailSent = false;
  }

  return {
    id: userId,
    name: safeName,
    email,
    devCode: verificationCode, // Always return for ConfirmEmailPage to show
    emailSent,
    message: emailSent
      ? "Código de verificação enviado! Verifique seu email."
      : "Não foi possível enviar o email. Use 'Reenviar Código'.",
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 1. REGISTRO
// ────────────────────────────────────────────────────────────────────────────

export async function register(email, password, role, extra = {}) {
  if (!Object.values(ROLES).includes(role)) {
    throw new Error("Tipo de conta inválido.");
  }

  if (!email || !email.includes("@")) throw new Error("Email inválido");

  const identityCandidates = [
    extra.company_name,
    email,
    String(email).split("@")[0],
    extra.phone,
  ];

  if (isPasswordBasedOnIdentity(password, identityCandidates)) {
    throw new Error("A senha não pode ser igual ao nome, email ou telefone.");
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(`Senha fraca: ${passwordValidation.errors.join(", ")}`);
  }

  const limiter = registerLimiter.check(email);
  if (!limiter.allowed) {
    throw new Error("Muitas tentativas de registro. Tente novamente depois.");
  }

  // ✅ CHAMAR ENDPOINT SEGURO DO BACKEND (com service role key)
  try {
    // Timeout mais tolerante para ambientes lentos
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      REGISTER_ENDPOINT_TIMEOUT_MS,
    );

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        role,
        name: extra.company_name?.trim() || "Usuário",
        phone: extra.phone?.trim() || "",
        city: extra.city?.trim() || null,
        notes: extra.notes?.trim() || null,
      }),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);
    const contentType = response.headers.get("content-type") || "";
    const rawBody = await response.text();
    let data = {};

    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = {};
      }
    }

    if (!contentType.includes("application/json")) {
      await logSecurityEvent(
        "register_failed",
        null,
        "auth",
        null,
        `email=${email} role=${role} status=${response.status} reason=non_json_response`,
      );
      throw new Error(
        "Endpoint de registro indisponível no servidor local (/api/register).",
      );
    }

    if (!response.ok) {
      const serverFailure = response.status >= 500;
      const serviceUnavailable = data.code === "SERVICE_UNAVAILABLE";
      const validationErrors = new Set([
        "Email inválido",
        "Senha deve ter no mínimo 8 caracteres",
        "Telefone inválido",
        "Tipo de conta inválido",
        "A senha não pode ser igual ao nome, email ou telefone",
      ]);
      const backendCreationFailure =
        response.status === 400 &&
        ["Erro ao criar conta", "Erro ao criar perfil", "Erro ao gerar código"].includes(
          data.error,
        );
      const unknownBadRequestInDev =
        import.meta.env.DEV &&
        response.status === 400 &&
        !validationErrors.has(data.error);
      const failureMessage =
        data.message || data.error || "Erro ao criar conta. Tente novamente.";

      if (import.meta.env.DEV) {
        console.warn("[auth] /api/register falhou", {
          status: response.status,
          body: data,
          rawBody,
        });
      }

      await logSecurityEvent(
        "register_failed",
        null,
        "auth",
        null,
        `email=${email} role=${role} status=${response.status} reason=${data.error}`,
      );

      if (serverFailure || serviceUnavailable) {
        throw new Error(`API_REGISTER_UNAVAILABLE: ${failureMessage}`);
      }

      // Em dev/local, se o endpoint falhar no processo interno de criação,
      // tenta fallback direto via cliente Supabase para não bloquear cadastro.
      if (backendCreationFailure || unknownBadRequestInDev) {
        return registerViaClientFallback(email, password, role, extra);
      }

      throw new Error(failureMessage);
    }

    const userId = data.id;
    const devCode = data.devCode;

    // Enviar email com codigo via n8n webhook
    let emailSent = false;
    if (devCode) {
      try {
        await sendVerificationEmail(
          email,
          devCode,
          extra.company_name || "Usuario",
        );
        emailSent = true;
        console.log("Email de verificacao enviado via N8N para", email);
      } catch (emailError) {
        console.warn("Falha ao enviar email de verificacao:", emailError?.message);
        emailSent = false;
      }
    }

    logSecurityEvent(
      "register_pending",
      userId,
      "auth",
      null,
      `email=${email} role=${role} emailSent=${emailSent}`,
    ).catch(() => {});

    return {
      id: userId,
      name: extra.company_name?.trim() || "Usuário",
      email,
      emailSent,
      message: emailSent
        ? "Código de verificação enviado! Verifique seu email."
        : "Não foi possível enviar o email. Use 'Reenviar Código'.",
    };
  } catch (error) {
    if (error.name === "AbortError") {
      await logSecurityEvent(
        "register_failed",
        null,
        "auth",
        null,
        `email=${email} role=${role} error=timeout`,
      );
      // Em ambiente local ou backend lento, cai para fallback direto no Supabase
      return registerViaClientFallback(email, password, role, extra);
    }

    const endpointUnavailable =
      String(error?.message || "").includes(
        "Endpoint de registro indisponível",
      ) ||
      String(error?.message || "").includes("Failed to fetch") ||
      String(error?.message || "").includes("API_REGISTER_UNAVAILABLE") ||
      String(error?.message || "").includes(
        "Falha ao processar /api/register no dev server",
      );

    if (endpointUnavailable) {
      return registerViaClientFallback(email, password, role, extra);
    }

    await logSecurityEvent(
      "register_failed",
      null,
      "auth",
      null,
      `email=${email} role=${role} error=${error.message}`,
    );
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 2. VERIFICAR EMAIL (REGISTRO)
// ────────────────────────────────────────────────────────────────────────────

export async function verifyEmailForRegistration(pendingId, code) {
  if (!pendingId) throw new Error("ID do cadastro é obrigatório");
  if (!code || code.length !== 6)
    throw new Error("Código de verificação inválido");

  // Buscar código de verificação
  const { data: verification } = await supabase
    .from("email_verifications")
    .select("*")
    .eq("user_id", pendingId)
    .eq("verified", false)
    .maybeSingle();

  if (!verification) {
    throw new Error(
      "Código de verificação não encontrado. Tente se registrar novamente.",
    );
  }

  // Verificar código
  if (verification.code !== code) {
    throw new Error("Código de verificação inválido.");
  }

  // Verificar expiração
  if (Date.now() > new Date(verification.expires_at).getTime()) {
    throw new Error("Código de verificação expirado. Solicite um novo.");
  }

  // ✅ MARCAR EMAIL COMO VERIFICADO
  const { error: updateVerificationError } = await supabase
    .from("email_verifications")
    .update({ verified: true })
    .eq("id", verification.id);

  if (updateVerificationError) {
    throw new Error("Erro ao verificar email. Tente novamente.");
  }

  // Marcar email como verificado na tabela users
  const { data: updatedUser, error: updateUserError } = await supabase
    .from("users")
    .update({ email_verified: true })
    .eq("id", pendingId)
    .select(
      "id, name, email, phone, role, city, notes, active, email_verified, profile_photo_url",
    )
    .single();

  if (updateUserError) {
    throw new Error("Erro ao atualizar perfil. Tente novamente.");
  }

  // Criar registro em vendors se aplicável
  if (updatedUser.role === ROLES.VENDOR) {
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", pendingId)
      .maybeSingle();

    if (!existingVendor) {
      await supabase.from("vendors").insert({
        user_id: pendingId,
        name: updatedUser.name,
        phone: updatedUser.phone || "",
        city: updatedUser.city,
      });
    }
  }

  await logSecurityEvent(
    "email_verified",
    pendingId,
    "auth",
    null,
    `email=${updatedUser.email}`,
  );

  return updatedUser;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. LOGIN
// ────────────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  if (!email || !email.includes("@")) throw new Error("Email inválido");
  if (!password) throw new Error("Senha obrigatória");

  const limiter = loginLimiter.check(email);
  if (!limiter.allowed) {
    throw new Error(
      `Muitas tentativas. Tente novamente em ${limiter.retryAfter}s`,
    );
  }

  console.log("🔐 Login: iniciando para", email);
  try {
    const loginPromise = async () => {
      console.log("🔐 Step 1: Autenticando com Supabase");

      let authResponse = null;
      try {
        authResponse = await withTimeout(
          () =>
            supabase.auth.signInWithPassword({
              email,
              password,
            }),
          LOGIN_AUTH_STEP_TIMEOUT_MS,
          "Tempo limite na autenticação.",
          "AUTH_TIMEOUT",
        );
      } catch (stepError) {
        if (stepError?.code === "AUTH_TIMEOUT") {
          // Recupera estado local potencialmente corrompido e usa fallback via endpoint Auth
          clearSupabaseAuthLocalState();
          await supabase.auth.signOut().catch(() => {});

          authResponse = await withTimeout(
            () => signInWithPasswordDirect(email, password),
            LOGIN_AUTH_STEP_TIMEOUT_MS,
            "Tempo limite na autenticação.",
            "AUTH_TIMEOUT",
          );
        } else {
          throw stepError;
        }
      }

      const { data: authData, error: authError } = authResponse || {};

      if (authError) {
        const authMessage = String(authError?.message || "");
        console.error("🔐 Step 1 ERRO:", authMessage);
        logSecurityEvent(
          "login_failed",
          null,
          "auth",
          null,
          `email=${email} reason=${authMessage}`,
        ).catch(() => {});

        if (isEmailNotConfirmedMessage(authMessage)) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        if (isInvalidCredentialsMessage(authMessage)) {
          const existingUser = await findUserByEmail(email).catch(() => null);

          if (!existingUser) {
            throw new Error("EMAIL_NOT_REGISTERED");
          }

          if (!existingUser.active) {
            throw new Error("Sua conta está desativada.");
          }

          if (!existingUser.email_verified) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }

          if (
            typeof existingUser.password_hash === "string" &&
            existingUser.password_hash.trim().length > 0
          ) {
            throw createLegacyMigrationError();
          }

          throw new Error("Senha incorreta.");
        }

        throw new Error(authMessage || "Erro ao autenticar.");
      }

      if (!authData?.user) {
        throw new Error("Erro ao fazer login. Tente novamente.");
      }

      console.log("🔐 Step 2: Buscando dados do usuário");
      // Buscar dados do usuário
      let userData = null;
      try {
        const { data } = await withTimeout(
          () =>
            supabase
              .from("users")
              .select(USER_PROFILE_SELECT_FIELDS)
              .eq("id", authData.user.id)
              .maybeSingle(),
          LOGIN_PROFILE_STEP_TIMEOUT_MS,
          "Tempo limite ao carregar perfil.",
          "PROFILE_TIMEOUT",
        );
        userData = data ?? null;
      } catch (profileError) {
        if (profileError?.code !== "PROFILE_TIMEOUT") {
          throw profileError;
        }
      }

      let resolvedUser = userData;
      if (!resolvedUser) {
        try {
          resolvedUser = await withTimeout(
            () => ensureUserProfileFromAuth(authData.user, email),
            LOGIN_PROFILE_STEP_TIMEOUT_MS,
            "Tempo limite ao sincronizar perfil.",
            "PROFILE_SYNC_TIMEOUT",
          );
        } catch (syncError) {
          if (syncError?.code !== "PROFILE_SYNC_TIMEOUT") {
            throw syncError;
          }
        }
      }

      if (!resolvedUser) {
        resolvedUser = buildFallbackUserFromAuth(authData.user, email);
      }

      if (!resolvedUser) {
        throw new Error("Perfil de usuário não encontrado.");
      }

      if (!resolvedUser.active) {
        await supabase.auth.signOut();
        throw new Error("Sua conta está desativada.");
      }

      if (!resolvedUser.email_verified) {
        await supabase.auth.signOut();
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      console.log("🔐 Step 3: Verificando vendor");
      // Sincronizar vendedor se aplicável
      if (resolvedUser.role === ROLES.VENDOR) {
        const { data: vRow } = await supabase
          .from("vendors")
          .select("id, photo_url")
          .eq("user_id", resolvedUser.id)
          .maybeSingle();

        resolvedUser.vendorId = vRow?.id ?? null;
        resolvedUser.profile_photo_url =
          vRow?.photo_url || resolvedUser.profile_photo_url;
      }

      console.log("🔐 Step 4: Registrando login bem-sucedido");
      logSecurityEvent(
        "login_success",
        resolvedUser,
        "auth",
        resolvedUser.id,
        `role=${resolvedUser.role}`,
      ).catch(() => {});

      console.log("✅ Login: sucesso para", email);
      return resolvedUser;
    };

    const userData = await withTimeout(
      () => loginPromise(),
      LOGIN_TIMEOUT_MS,
      "Login demorou mais que o esperado. Tente novamente. Se persistir, recarregue a página (Ctrl+F5).",
      "LOGIN_TIMEOUT",
    );

    return userData;
  } catch (error) {
    console.error("❌ Login erro:", error?.message);

    if (
      error?.code === "AUTH_TIMEOUT" ||
      error?.code === "LOGIN_TIMEOUT" ||
      error?.code === "PROFILE_TIMEOUT" ||
      error?.code === "PROFILE_SYNC_TIMEOUT"
    ) {
      throw new Error(
        "Login demorou mais que o esperado. Tente novamente. Se persistir, recarregue a página (Ctrl+F5).",
      );
    }

    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 4. SENHA PERDIDA - ENVIAR CÓDIGO
// ────────────────────────────────────────────────────────────────────────────

export async function startPasswordRecovery(email) {
  if (!email || !email.includes("@")) throw new Error("Email inválido");

  // Verificar se usuário existe
  const { data: user } = await supabase
    .from("users")
    .select("id, name")
    .eq("email", email)
    .maybeSingle();

  if (!user) {
    // Não revelar se email existe por segurança
    await logSecurityEvent(
      "password_recovery_failed",
      null,
      "auth",
      null,
      `email=${email} reason=user_not_found`,
    );
    return {
      success: true,
      message: "Se este email existe, você receberá um código.",
    };
  }

  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  // Salvar em email_verifications (reutilizar tabela existente)
  const { error: insertError } = await supabase
    .from("email_verifications")
    .insert({
      user_id: user.id,
      code: verificationCode,
      expires_at: expiresAt.toISOString(),
      verified: false,
    });

  if (insertError) {
    throw new Error("Erro ao processar recuperação de senha.");
  }

  // Enviar email com código via n8n webhook
  let emailSent = false;
  try {
    await sendPasswordRecoveryEmail(
      email,
      verificationCode,
      "",
      user.name || "Usuário",
    );
    emailSent = true;
  } catch (err) {
    console.error("Erro ao enviar email de recuperação:", err);
    emailSent = false;
  }

  await logSecurityEvent(
    "password_recovery_started",
    { email },
    "auth",
    user.id,
    `emailSent=${emailSent}`,
  );

  return {
    success: true,
    message: emailSent
      ? "Código de verificação enviado para seu email!"
      : "Se este email existe, você receberá um código.",
    devCode: !emailSent ? verificationCode : undefined,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 5. SENHA PERDIDA - VALIDAR CÓDIGO (SEM ALTERAR SENHA)
// ────────────────────────────────────────────────────────────────────────────

export async function verifyPasswordRecoveryCode(email, code) {
  if (!email) throw new Error("Email é obrigatório");
  if (!code || code.length !== 6) throw new Error("Código inválido");

  try {
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code,
        verifyOnly: true,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Código inválido ou expirado");
    }

    return {
      success: true,
      message: result.message || "Código validado com sucesso.",
    };
  } catch (err) {
    throw new Error(err?.message || "Erro ao validar código.");
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 6. SENHA PERDIDA - CONFIRMAR CÓDIGO E ALTERAR SENHA
// ────────────────────────────────────────────────────────────────────────────

export async function resetPasswordWithCode(email, code, newPassword) {
  if (!email) throw new Error("Email é obrigatório");
  if (!code || code.length !== 6) throw new Error("Código inválido");

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(`Senha fraca: ${passwordValidation.errors.join(", ")}`);
  }

  // Chamar backend endpoint para redefinir senha
  // O endpoint faz a validação completa e atualiza via admin API
  try {
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code,
        newPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao redefinir senha");
    }

    await logSecurityEvent(
      "password_reset_success",
      { email },
      "auth",
      null,
      "Password changed successfully",
    );

    return {
      success: true,
      message: "Senha alterada com sucesso! Você pode fazer login agora.",
    };
  } catch (err) {
    await logSecurityEvent(
      "password_reset_failed",
      { email },
      "auth",
      null,
      `reason=${err?.message}`,
    );
    throw new Error(err?.message || "Erro ao redefinir senha.");
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 6. LOGOUT
// ────────────────────────────────────────────────────────────────────────────

export async function logout() {
  clearSession();
  await supabase.auth.signOut();
}

// ────────────────────────────────────────────────────────────────────────────
// 7. REENVIAR CÓDIGO (REGISTRO OU RECUPERAÇÃO)
// ────────────────────────────────────────────────────────────────────────────

export async function resendVerificationCode(email, type = "registration") {
  if (!email) throw new Error("Email é obrigatório");

  if (type === "registration") {
    const { data: user } = await supabase
      .from("users")
      .select("id, name, email_verified")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      throw new Error("Cadastro não encontrado. Tente se registrar novamente.");
    }

    if (user.email_verified) {
      throw new Error("Este email já foi verificado. Faça login normalmente.");
    }

    const newCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { data: existingCodes } = await supabase
      .from("email_verifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("verified", false)
      .limit(1);

    if (existingCodes?.length) {
      await supabase
        .from("email_verifications")
        .update({
          code: newCode,
          expires_at: expiresAt.toISOString(),
          verified: false,
        })
        .eq("id", existingCodes[0].id);
    } else {
      await supabase.from("email_verifications").insert({
        user_id: user.id,
        code: newCode,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });
    }

    try {
      await sendVerificationEmail(email, newCode, user.name || "Usuário");
    } catch (err) {
      console.error("Erro ao reenviar código:", err);
    }
    return { success: true, message: "Código reenviado!" };
  }

  if (type === "password") {
    const { data: user } = await supabase
      .from("users")
      .select("id, name")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      throw new Error("Recuperação não solicitada. Tente novamente.");
    }

    const newCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await supabase.from("email_verifications").insert({
      user_id: user.id,
      code: newCode,
      expires_at: expiresAt.toISOString(),
      verified: false,
    });

    try {
      await sendPasswordRecoveryEmail(
        email,
        newCode,
        "",
        user.name || "Usuário",
      );
    } catch (err) {
      console.error("Erro ao reenviar código de recuperação:", err);
    }
    return { success: true, message: "Código reenviado!" };
  }

  throw new Error("Tipo de reenvio inválido");
}

// ────────────────────────────────────────────────────────────────────────────
// 8. DELETAR CONTA
// ────────────────────────────────────────────────────────────────────────────

export async function deleteAccount(password, user) {
  if (!user?.id) throw new Error("Usuário não autenticado");

  // Verificar senha
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (authError) {
    throw new Error("Senha incorreta.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const response = await fetch("/api/delete-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ userId: user.id }),
  });

  if (!response.ok) {
    const raw = await response.text();
    let payload = {};
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }
    throw new Error(payload?.error || "Não foi possível deletar a conta.");
  }

  clearSession();
  await supabase.auth.signOut();

  await logSecurityEvent(
    "account_deleted",
    user,
    "auth",
    user.id,
    "User deleted account",
  );
}

export async function updateUser(userId, updates = {}) {
  if (!userId) throw new Error("ID do usuário é obrigatório");

  const payload = {
    name: updates.name?.trim(),
    phone: updates.phone?.trim() || "",
    city: updates.city?.trim() || null,
    profile_photo_url: updates.profile_photo_url || null,
  };

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", userId)
    .select(
      "id, name, email, phone, role, city, notes, active, email_verified, profile_photo_url",
    )
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar o perfil.");
  }

  if (data.role === ROLES.VENDOR && data.profile_photo_url) {
    await supabase
      .from("vendors")
      .update({ photo_url: data.profile_photo_url })
      .eq("user_id", userId);
  }

  return data;
}

export async function fetchGestorsAdmin() {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, phone, city, active, created_at, role")
    .eq("role", ROLES.GESTOR)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Erro ao carregar gestores.");
  }

  return data || [];
}

export async function setGestorActive(userId, active) {
  if (!userId) throw new Error("ID do gestor é obrigatório");

  const { error } = await supabase
    .from("users")
    .update({ active: !!active })
    .eq("id", userId)
    .eq("role", ROLES.GESTOR);

  if (error) {
    throw new Error("Não foi possível atualizar o status do gestor.");
  }

  await logSecurityEvent(
    "gestor_status_updated",
    { userId, active: !!active },
    "admin",
    userId,
    `active=${!!active}`,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT
// ────────────────────────────────────────────────────────────────────────────

export default {
  register,
  verifyEmailForRegistration,
  login,
  logout,
  startPasswordRecovery,
  resetPasswordWithCode,
  resendVerificationCode,
  deleteAccount,
  updateUser,
  fetchGestorsAdmin,
  setGestorActive,
  getSession,
  saveSession,
  clearSession,
};
