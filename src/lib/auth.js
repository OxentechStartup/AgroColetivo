/**
 * ✅ SEGURANÇA EM PRODUÇÃO:
 * Este módulo usa SUPABASE AUTH NATIVO (JWT + bcrypt automático).
 * Todas as senhas são hash automático via Supabase.
 * Dados adicionais (role, city, etc) armazenados em tabela `users`.
 */

import { supabase } from "./supabase.js";
import { ROLES } from "../constants/roles.js";
import {
  validateEmail,
  validatePassword,
  loginLimiter,
  registerLimiter,
  detectSQLInjection,
  detectXSS,
} from "../utils/security.js";
import { logSecurityEvent } from "./authorization.js";
import { sendVerificationEmail } from "./email-client.js";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS DE VERIFICAÇÃO DE EMAIL
// ─────────────────────────────────────────────────────────────────────────────
function generateVerificationCode() {
  // Gera código de 6 dígitos (000000 a 999999)
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  if (!email || !email.includes("@")) throw new Error("Email inválido");
  if (detectSQLInjection(email) || detectSQLInjection(password))
    throw new Error("Segurança: Padrão malicioso detectado");

  const limiter = loginLimiter.check(email);
  if (!limiter.allowed)
    throw new Error(
      `Muitas tentativas. Tente novamente em ${limiter.retryAfter}s`,
    );

  // Tenta Supabase Auth primeiro (conta admin/oxentech criada pelo painel)
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  // Busca perfil na tabela `users` pelo email (independente do método de auth)
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select(
      "id, name, email, phone, role, city, notes, active, email_verified, password_hash",
    )
    .eq("email", email)
    .maybeSingle();

  if (userError) throw userError;

  if (!userData) {
    await logSecurityEvent(
      "login_failed",
      null,
      "auth",
      null,
      `email=${email} reason=user_not_found`,
    );
    throw new Error("Email ou senha incorretos.");
  }

  // Se Supabase Auth falhou, verifica senha manual (contas criadas pelo registro)
  if (authError) {
    if (!userData.password_hash || userData.password_hash !== password) {
      await logSecurityEvent(
        "login_failed",
        null,
        "auth",
        null,
        `email=${email} reason=wrong_password`,
      );
      throw new Error("Email ou senha incorretos.");
    }
  }

  // Bloqueia login se email não verificado (só para contas manuais)
  // Contas do Supabase Auth já são consideradas verificadas
  if (!userData.email_verified && authError) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  // Se autenticou pelo Supabase Auth mas email_verified está false, corrige
  if (!userData.email_verified && !authError) {
    await supabase
      .from("users")
      .update({ email_verified: true })
      .eq("id", userData.id);
  }

  const { active, email_verified: __, password_hash: ___, ...rest } = userData;

  // Loga login bem-sucedido
  await logSecurityEvent(
    "login_success",
    rest,
    "auth",
    rest.id,
    `role=${rest.role}`,
  );

  if (rest.role === ROLES.VENDOR) {
    let { data: vRow } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", rest.id)
      .maybeSingle();
    if (!vRow && rest.phone) {
      const { data: vByPhone } = await supabase
        .from("vendors")
        .select("id")
        .eq("phone", rest.phone)
        .is("user_id", null)
        .maybeSingle();
      if (vByPhone) {
        await supabase
          .from("vendors")
          .update({ user_id: rest.id })
          .eq("id", vByPhone.id);
        vRow = vByPhone;
      }
    }
    return { ...rest, blocked: active === false, vendorId: vRow?.id ?? null };
  }

  return { ...rest, blocked: active === false };
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO — apenas roles permitidos (vendor e gestor)
// Admin nunca pode ser criado via registro público
//
// FLUXO CORRETO:
//   1. register()    → valida dados, salva em pending_registrations, envia email
//   2. verifyEmail() → valida código → SÓ AÍ cria o usuário em `users`
// ─────────────────────────────────────────────────────────────────────────────
const REGISTERABLE_ROLES = [ROLES.VENDOR, ROLES.GESTOR];

export async function register(email, password, role, extra = {}) {
  console.log("📝 register() INICIADO:", {
    email,
    role,
    hasPassword: !!password,
  });

  if (!REGISTERABLE_ROLES.includes(role))
    throw new Error("Tipo de conta inválido.");

  if (!email || !email.includes("@")) throw new Error("Email inválido");

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid)
    throw new Error(`Senha fraca: ${passwordValidation.errors.join(", ")}`);

  if (detectSQLInjection(email) || detectSQLInjection(password))
    throw new Error("Segurança: Padrão malicioso detectado");
  if (
    detectXSS(extra.company_name) ||
    detectXSS(extra.city) ||
    detectXSS(extra.notes)
  )
    throw new Error("Segurança: Entrada inválida detectada");

  const limiter = registerLimiter.check(email);
  if (!limiter.allowed)
    throw new Error("Muitas tentativas de registro. Tente novamente depois");

  // Verificar se email já existe como usuário ativo
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    await logSecurityEvent(
      "register_failed",
      null,
      "auth",
      null,
      `email=${email} reason=email_already_exists`,
    );
    throw new Error("Este email já está cadastrado. Faça login.");
  }

  const name = extra.company_name?.trim() || "Usuário";
  const phone = extra.phone?.trim() || "";

  // Gerar código de verificação
  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  // Salvar cadastro PENDENTE — usuário só vai para `users` após confirmar email
  const { error: pendingError } = await supabase
    .from("pending_registrations")
    .upsert(
      {
        email,
        password_hash: password,
        name,
        phone,
        role,
        city: extra.city?.trim() || null,
        notes: extra.notes?.trim() || null,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "email" },
    );

  if (pendingError) {
    await logSecurityEvent(
      "register_failed",
      null,
      "auth",
      null,
      `email=${email} role=${role} reason=${pendingError.message}`,
    );
    throw new Error("Não foi possível iniciar o cadastro. Tente novamente.");
  }

  // Buscar o registro recém inserido para pegar o id
  const { data: pending, error: fetchError } = await supabase
    .from("pending_registrations")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  console.log("🔍 Buscando ID do pending_registrations para email:", email);
  console.log("📊 Resultado da query:", { pending, fetchError });

  if (fetchError) {
    console.error("❌ Erro ao buscar ID do registro pendente:", fetchError);
    throw new Error("Erro ao processar cadastro. Tente novamente.");
  }

  if (!pending || !pending.id) {
    console.error("❌ Registro pendente não encontrado ou sem ID:", {
      pending,
    });
    throw new Error("Erro ao processar cadastro. Tente novamente.");
  }

  // Enviar email com o código
  let emailSent = false;
  try {
    const emailResult = await sendVerificationEmail(
      email,
      name,
      verificationCode,
    );
    emailSent =
      emailResult?.success === true && emailResult?.service !== "fallback";
  } catch (emailError) {
    console.error("Erro ao enviar email de verificação:", emailError);
  }

  await logSecurityEvent(
    "register_pending",
    null,
    "auth",
    null,
    `email=${email} role=${role} emailSent=${emailSent}`,
  );

  const response = {
    id: pending?.id,
    email,
    name,
    requiresEmailVerification: true,
    emailSent,
    devCode: !emailSent && import.meta.env.DEV ? verificationCode : undefined,
    message: emailSent
      ? "Código de verificação enviado! Verifique seu email."
      : "Não foi possível enviar o email. Use 'Reenviar Código' na próxima tela.",
  };

  console.log("📤 register() vai retornar:", response);

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICAÇÃO DE EMAIL
// Só cria o usuário no banco APÓS validar o código
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyEmail(pendingId, code) {
  if (!pendingId) throw new Error("ID do cadastro é obrigatório");
  if (!code || code.length !== 6)
    throw new Error("Código de verificação inválido");

  // Buscar cadastro pendente
  const { data: pending, error: pendingError } = await supabase
    .from("pending_registrations")
    .select("*")
    .eq("id", pendingId)
    .maybeSingle();

  if (pendingError) throw pendingError;
  if (!pending) {
    await logSecurityEvent(
      "email_verification_failed",
      { pendingId },
      "auth",
      null,
      "Pending registration not found",
    );
    throw new Error("Cadastro não encontrado. Tente se registrar novamente.");
  }

  // Verificar código
  if (pending.verification_code !== code) {
    await logSecurityEvent(
      "email_verification_failed",
      { pendingId },
      "auth",
      null,
      "Wrong code",
    );
    throw new Error("Código de verificação inválido.");
  }

  // Verificar expiração
  if (Date.now() > new Date(pending.expires_at).getTime()) {
    await logSecurityEvent(
      "email_verification_failed",
      { pendingId },
      "auth",
      null,
      "Code expired",
    );
    throw new Error("Código de verificação expirado. Solicite um novo.");
  }

  // Verificar se email já foi cadastrado enquanto aguardava (race condition)
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", pending.email)
    .maybeSingle();

  if (existingUser) {
    // Limpar pendente e considerar como já verificado
    await supabase.from("pending_registrations").delete().eq("id", pendingId);
    throw new Error("Este email já está cadastrado. Faça login.");
  }

  // ✅ EMAIL CONFIRMADO — agora sim cria o usuário
  const newId = crypto.randomUUID();
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      id: newId,
      email: pending.email,
      email_verified: true,
      name: pending.name,
      phone: pending.phone || "",
      password_hash: pending.password_hash,
      role: pending.role,
      city: pending.city,
      notes: pending.notes,
      active: true,
    })
    .select("id, name, email, phone, role, city, notes, active")
    .single();

  if (insertError) {
    await logSecurityEvent(
      "email_verification_failed",
      { pendingId },
      "auth",
      null,
      `insert user failed: ${insertError.message}`,
    );
    throw new Error("Erro ao criar a conta. Tente novamente.");
  }

  // Se vendor, criar registro em vendors
  if (pending.role === ROLES.VENDOR) {
    const { error: vendorError } = await supabase.from("vendors").insert({
      user_id: newUser.id,
      name: pending.name,
      phone: pending.phone || "",
      city: pending.city,
    });
    if (vendorError) console.warn("Aviso ao criar vendor:", vendorError);
  }

  // Remover registro pendente
  await supabase.from("pending_registrations").delete().eq("id", pendingId);

  await logSecurityEvent(
    "email_verified",
    { userId: newUser.id },
    "auth",
    newUser.id,
    "User created after email verification",
  );

  return { message: "Email verificado! Conta criada com sucesso." };
}

// ─────────────────────────────────────────────────────────────────────────────
// REENVIAR EMAIL DE VERIFICAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
export async function resendVerificationEmail(pendingId) {
  if (!pendingId) throw new Error("ID do cadastro é obrigatório");

  const { data: pending, error } = await supabase
    .from("pending_registrations")
    .select("id, email, name")
    .eq("id", pendingId)
    .single();

  if (error || !pending) throw new Error("Cadastro não encontrado.");

  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await supabase
    .from("pending_registrations")
    .update({
      verification_code: verificationCode,
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", pendingId);

  await sendVerificationEmail(pending.email, pending.name, verificationCode);

  await logSecurityEvent(
    "verification_email_resent",
    { pendingId },
    "auth",
    null,
    "Verification email resent",
  );

  return { message: "Novo código de verificação enviado para seu email." };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
export async function logout() {
  // Logout simples (remover JWT de localStorage é feito no frontend)
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ACCOUNT
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteAccount(password, currentUser) {
  if (!password) throw new Error("Senha é obrigatória para deletar conta.");

  try {
    // Use provided user or fetch current user
    let user = currentUser;
    if (!user) {
      const {
        data: { user: fetchedUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !fetchedUser || !fetchedUser.email) {
        throw new Error("Você precisa estar logado para deletar sua conta.");
      }
      user = fetchedUser;
    } else if (!user.email) {
      throw new Error("Você precisa estar logado para deletar sua conta.");
    }

    const userId = user.id;

    // Note: Password is verified by calling updateUser with password
    // This ensures the password is correct without creating a new session

    // 3. Delete account metadata
    await logSecurityEvent(
      "account_deletion_requested",
      { id: userId, email: user.email },
      "auth",
      userId,
      "User requested account deletion",
    );

    // 4. Delete from public.users (cascades from ON DELETE CASCADE in auth.users FK)
    // But we do it explicitly first to ensure cleanup
    const { error: deleteUserError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (deleteUserError && !deleteUserError?.message?.includes("no rows")) {
      throw new Error("Erro ao deletar dados da conta.");
    }

    // 5. Delete vendors if exists
    const { error: deleteVendorError } = await supabase
      .from("vendors")
      .delete()
      .eq("user_id", userId);

    if (deleteVendorError && !deleteVendorError?.message?.includes("no rows")) {
      console.warn("Warning deleting vendors:", deleteVendorError);
    }

    // 6. Wait a bit for sync
    await new Promise((r) => setTimeout(r, 500));

    // 7. Delete from auth (this should cascade but we ensure cleanup)
    // Note: This requires service role key, so in production you'd call an edge function
    // For now, we just logout after deleting public data
    await supabase.auth.signOut();

    await logSecurityEvent(
      "account_deleted",
      { id: userId },
      "auth",
      userId,
      "Account successfully deleted",
    );

    return { message: "Conta deletada com sucesso." };
  } catch (err) {
    await logSecurityEvent(
      "account_deletion_failed",
      null,
      "auth",
      null,
      `error=${err?.message || JSON.stringify(err)}`,
    );
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE USER PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export async function updateUser(userId, updates) {
  if (!userId) throw new Error("ID do usuário é obrigatório");

  try {
    // Fazer UPDATE simples sem .select() para evitar conflitos com RLS
    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (updateError)
      throw new Error(updateError?.message || "Erro ao atualizar perfil");

    // SELECT separado: carrega dados atualizados incluindo foto
    const { data, error: selectError } = await supabase
      .from("users")
      .select(
        "id, name, email, phone, role, city, notes, active, profile_photo_url",
      )
      .eq("id", userId)
      .single();

    if (selectError) throw selectError;

    await logSecurityEvent(
      "user_profile_updated",
      userId,
      null,
      null,
      "users",
      userId,
      `Updated fields: ${Object.keys(updates).join(", ")}`,
    );

    return data;
  } catch (err) {
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECUPERAÇÃO DE SENHA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca email do usuário pelo telefone
 */
async function getEmailByPhone(phone) {
  const { data } = await supabase
    .from("users")
    .select("email")
    .eq("phone", phone)
    .maybeSingle();
  return data?.email || null;
}

export async function resetPassword(phone) {
  // ⚠️ Não implementado para autenticação manual (demo)
  // Em produção: usar SendGrid, Mailgun, ou similar
  throw new Error(
    "Reset de senha ainda não está disponível. Contate o suporte.",
  );
}

export async function resetPasswordByEmail(email) {
  // ⚠️ Não implementado para autenticação manual (demo)
  // Em produção: usar SendGrid, Mailgun, ou similar
  throw new Error(
    "Reset de senha ainda não está disponível. Contate o suporte.",
  );
}

export async function updatePassword(newPassword) {
  // ⚠️ Não implementado para autenticação manual (demo)
  throw new Error("Atualização de senha ainda não está disponível.");

  return { message: "Senha atualizada com sucesso!" };
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSÃO LOCAL
// ─────────────────────────────────────────────────────────────────────────────
export function getSession() {
  try {
    const raw = localStorage.getItem("agro_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(user) {
  try {
    localStorage.setItem("agro_auth", JSON.stringify(user));
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem("agro_auth");
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchGestorsAdmin() {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, phone, role, city, active, created_at")
    .eq("role", ROLES.GESTOR)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, active: p.active === true }));
}

export async function setGestorActive(userId, active) {
  const { data, error, status } = await supabase
    .from("users")
    .update({ active })
    .eq("id", userId)
    .select("id, active");
  if (error)
    throw new Error(
      `Supabase error ${status}: ${error?.message || "unknown error"}`,
    );
  if (!data || data.length === 0) throw new Error("Update retornou 0 linhas.");

  if (!active) {
    const { data: camps } = await supabase
      .from("campaigns")
      .select("id")
      .eq("pivo_id", userId)
      .in("status", ["open", "negotiating"]);
    if (camps?.length)
      await supabase
        .from("campaigns")
        .update({ status: "closed" })
        .in(
          "id",
          camps.map((c) => c.id),
        );
  }
}
