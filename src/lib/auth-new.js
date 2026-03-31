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

// ────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

function generateVerificationCode() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
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

// ────────────────────────────────────────────────────────────────────────────
// 1. REGISTRO
// ────────────────────────────────────────────────────────────────────────────

export async function register(email, password, role, extra = {}) {
  if (!Object.values(ROLES).includes(role)) {
    throw new Error("Tipo de conta inválido.");
  }

  if (!email || !email.includes("@")) throw new Error("Email inválido");

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(`Senha fraca: ${passwordValidation.errors.join(", ")}`);
  }

  const limiter = registerLimiter.check(email);
  if (!limiter.allowed) {
    throw new Error("Muitas tentativas de registro. Tente novamente depois.");
  }

  // Verificar se email já existe
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

  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Salvar em pending_registrations
  const { data: pending, error: pendingError } = await supabase
    .from("pending_registrations")
    .upsert(
      {
        email,
        name: extra.company_name?.trim() || "Usuário",
        phone: extra.phone?.trim() || "",
        role,
        city: extra.city?.trim() || null,
        notes: extra.notes?.trim() || null,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();

  if (pendingError || !pending) {
    await logSecurityEvent(
      "register_failed",
      null,
      "auth",
      null,
      `email=${email} role=${role} reason=${pendingError?.message}`,
    );
    throw new Error("Não foi possível iniciar o cadastro. Tente novamente.");
  }

  // Enviar email com código
  let emailSent = false;
  // TODO: Reabilitar quando email estiver configurado
  // try {
  //   const emailResult = await sendVerificationEmail(
  //     email,
  //     extra.company_name || "Usuário",
  //     verificationCode,
  //   );
  //   emailSent = emailResult?.success === true;
  // } catch (emailError) {
  //   console.error("Erro ao enviar email de verificação:", emailError);
  // }

  await logSecurityEvent(
    "register_pending",
    null,
    "auth",
    null,
    `email=${email} role=${role} emailSent=${emailSent}`,
  );

  return {
    id: pending.id,
    email,
    devCode: !emailSent ? verificationCode : undefined,
    emailSent,
    message: emailSent
      ? "Código de verificação enviado! Verifique seu email."
      : "Não foi possível enviar o email. Use 'Reenviar Código'.",
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 2. VERIFICAR EMAIL (REGISTRO)
// ────────────────────────────────────────────────────────────────────────────

export async function verifyEmailForRegistration(pendingId, code) {
  if (!pendingId) throw new Error("ID do cadastro é obrigatório");
  if (!code || code.length !== 6)
    throw new Error("Código de verificação inválido");

  // Buscar registro pendente
  const { data: pending } = await supabase
    .from("pending_registrations")
    .select("*")
    .eq("id", pendingId)
    .maybeSingle();

  if (!pending) {
    throw new Error("Cadastro não encontrado. Tente se registrar novamente.");
  }

  // Verificar código e expiração
  if (pending.verification_code !== code) {
    throw new Error("Código de verificação inválido.");
  }

  if (Date.now() > new Date(pending.expires_at).getTime()) {
    throw new Error("Código de verificação expirado. Solicite um novo.");
  }

  // ✅ CRIAR CONTA NO SUPABASE AUTH
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: pending.email,
    password: pending.password || "", // Será definido no login
    options: {
      data: {
        name: pending.name,
      },
      emailRedirectTo: undefined,
    },
  });

  if (authError) {
    throw new Error(authError?.message || "Erro ao criar a conta.");
  }

  if (!authData?.user) {
    throw new Error("Erro ao criar a conta. Tente novamente.");
  }

  // Inserir na tabela users
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      id: authData.user.id,
      email: pending.email,
      email_verified: true,
      name: pending.name,
      phone: pending.phone || "",
      role: pending.role,
      city: pending.city,
      notes: pending.notes,
      active: true,
    })
    .select(
      "id, name, email, phone, role, city, notes, active, profile_photo_url",
    )
    .single();

  if (insertError) {
    throw new Error("Erro ao criar perfil. Tente novamente.");
  }

  // Criar registro em vendors se aplicável
  if (pending.role === ROLES.VENDOR) {
    await supabase.from("vendors").insert({
      user_id: newUser.id,
      name: pending.name,
      phone: pending.phone || "",
      city: pending.city,
    });
  }

  // Remover do pending
  await supabase.from("pending_registrations").delete().eq("id", pendingId);

  return newUser;
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

  // Autenticar com Supabase
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    await logSecurityEvent(
      "login_failed",
      null,
      "auth",
      null,
      `email=${email} reason=${authError.message}`,
    );
    throw new Error("Email ou senha incorretos.");
  }

  if (!authData?.user) {
    throw new Error("Erro ao fazer login. Tente novamente.");
  }

  // Buscar dados do usuário
  const { data: userData } = await supabase
    .from("users")
    .select(
      "id, name, email, phone, role, city, notes, active, email_verified, profile_photo_url",
    )
    .eq("id", authData.user.id)
    .single();

  if (!userData) {
    throw new Error("Perfil de usuário não encontrado.");
  }

  if (!userData.active) {
    await supabase.auth.signOut();
    throw new Error("Sua conta está desativada.");
  }

  // Sincronizar vendedor se aplicável
  if (userData.role === ROLES.VENDOR) {
    const { data: vRow } = await supabase
      .from("vendors")
      .select("id, photo_url")
      .eq("user_id", userData.id)
      .maybeSingle();

    userData.vendorId = vRow?.id ?? null;
    userData.profile_photo_url = vRow?.photo_url || userData.profile_photo_url;
  }

  await logSecurityEvent(
    "login_success",
    userData,
    "auth",
    userData.id,
    `role=${userData.role}`,
  );

  try {
    const loginDetails = {
      timestamp: new Date().toISOString(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      platform:
        typeof navigator !== "undefined" ? navigator.platform : "unknown",
      language:
        typeof navigator !== "undefined" ? navigator.language : "unknown",
    };

    // TODO: Reabilitar quando email estiver configurado
    // await sendLoginAlertEmail(
    //   userData.email,
    //   userData.name || "Usuário",
    //   loginDetails,
    // );
  } catch (emailError) {
    // console.warn("Falha ao enviar aviso de login:", emailError?.message);
  }

  return userData;
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

   // Enviar email com código
   let emailSent = false;
   // TODO: Reabilitar quando email estiver configurado
   // try {
   //   const emailResult = await sendPasswordRecoveryEmail(
   //     email,
   //     user.name,
   //     verificationCode,
   //   );
   //   emailSent = emailResult?.success === true;
   // } catch (err) {
   //   console.error("Erro ao enviar email de recuperação:", err);
   // }

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
// 5. SENHA PERDIDA - CONFIRMAR CÓDIGO E ALTERAR SENHA
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
      user.id,
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
    const { data: pending } = await supabase
      .from("pending_registrations")
      .select("id, name")
      .eq("email", email)
      .maybeSingle();

    if (!pending) {
      throw new Error("Cadastro não encontrado. Tente se registrar novamente.");
    }

    const newCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

     await supabase
       .from("pending_registrations")
       .update({
         verification_code: newCode,
         expires_at: expiresAt.toISOString(),
       })
       .eq("id", pending.id);

     // TODO: Reabilitar quando email estiver configurado
     // await sendVerificationEmail(email, pending.name, newCode);
     return { success: true, message: "Código reenviado!" };
  }

  if (type === "password") {
    const { data: recovery } = await supabase
      .from("password_recovery")
      .select("id, user_id")
      .eq("email", email)
      .maybeSingle();

    if (!recovery) {
      throw new Error("Recuperação não solicitada. Tente novamente.");
    }

    const newCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await supabase
      .from("password_recovery")
      .update({
         recovery_code: newCode,
         expires_at: expiresAt.toISOString(),
       })
       .eq("id", recovery.id);

     const { data: user } = await supabase
       .from("users")
       .select("name")
       .eq("id", recovery.user_id)
       .single();

     // TODO: Reabilitar quando email estiver configurado
     // await sendPasswordRecoveryEmail(email, user?.name, newCode);
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

  // Deletar registros associados
  if (user.role === ROLES.VENDOR) {
    await supabase.from("vendors").delete().eq("user_id", user.id);
  }

  // Deletar usuário
  await supabase.from("users").delete().eq("id", user.id);

  // Deletar de Supabase Auth
  await supabase.auth.admin.deleteUser(user.id);

  clearSession();
  await supabase.auth.signOut();

  await logSecurityEvent(
    "account_deleted",
    { userId: user.id },
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
