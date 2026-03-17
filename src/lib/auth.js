import { supabase } from "./supabase";
import { ROLES } from "../constants/roles";
import {
  validateEmail,
  validatePassword,
  loginLimiter,
  registerLimiter,
  detectSQLInjection,
  detectXSS,
} from "../utils/security";
import { logSecurityEvent } from "./authorization";

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

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    // Loga tentativa falha de login
    await logSecurityEvent(
      "login_failed",
      null,
      "auth",
      null,
      `email=${email} reason=${authError.message}`,
    );

    if (
      authError.message.includes("Invalid login credentials") ||
      authError.message.includes("Email not confirmed")
    )
      throw new Error("Email ou senha incorretos.");
    throw new Error(authError.message);
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, name, email, phone, role, city, notes, active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (userError) throw userError;
  if (!userData) throw new Error("Usuário não encontrado.");

  const { active, ...rest } = userData;

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
// REGISTRO — apenas roles permitidos (vendor e gestor)
// Admin nunca pode ser criado via registro público
// ─────────────────────────────────────────────────────────────────────────────
const REGISTERABLE_ROLES = [ROLES.VENDOR, ROLES.GESTOR];

export async function register(email, password, role, extra = {}) {
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

  // NÃO verificar se email existe (évita user enumeration)
  // Deixar Supabase lidar com duplicata

  const name = extra.company_name?.trim() || "Usuário";
  const phone = extra.phone?.trim() || null;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/confirmar-email`,
      data: {
        name,
        phone,
        role,
        city: extra.city?.trim() || null,
        notes: extra.notes?.trim() || null,
      },
    },
  });

  if (authError) {
    await logSecurityEvent(
      "register_failed",
      null,
      "auth",
      null,
      `email=${email} role=${role} reason=${authError.message}`,
    );

    if (authError.message.includes("already registered"))
      throw new Error("Este email já está cadastrado. Faça login.");
    throw new Error("Não foi possível criar a conta. Tente novamente.");
  }

  // Loga registro bem-sucedido
  await logSecurityEvent(
    "register_success",
    { id: authData.user.id, email, role },
    "auth",
    authData.user.id,
    `role=${role}`,
  );

  // Aguarda o trigger criar a linha em users/vendors
  await new Promise((r) => setTimeout(r, 800));

  const { data: userData } = await supabase
    .from("users")
    .select("id, name, email, phone, role, city, notes")
    .eq("id", authData.user.id)
    .maybeSingle();

  return (
    userData ?? {
      id: authData.user.id,
      name,
      email,
      phone: phone || null,
      role,
      city: extra.city?.trim() || null,
      notes: extra.notes?.trim() || null,
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
export async function logout() {
  await supabase.auth.signOut();
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ACCOUNT
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteAccount(password) {
  if (!password) throw new Error("Senha é obrigatória para deletar conta.");

  try {
    // 1. Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user || !user.email) {
      throw new Error("Você precisa estar logado para deletar sua conta.");
    }

    // 2. Testa credenciais fazendo um "login test"
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (authError) {
      throw new Error("Senha incorreta.");
    }

    const userId = user.id;

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

    if (deleteUserError && !deleteUserError.message.includes("no rows")) {
      throw new Error("Erro ao deletar dados da conta.");
    }

    // 5. Delete vendors if exists
    const { error: deleteVendorError } = await supabase
      .from("vendors")
      .delete()
      .eq("user_id", userId);

    if (deleteVendorError && !deleteVendorError.message.includes("no rows")) {
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
      `error=${err.message}`,
    );
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECUPERAÇÃO DE SENHA
// ─────────────────────────────────────────────────────────────────────────────
export async function resetPassword(phone) {
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) throw new Error(phoneValidation.error);

  const clean = phoneValidation.clean;
  const email = phoneToEmail(clean);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/resetar-senha`,
  });

  if (error) {
    // Não revela se o email existe ou não (segurança)
    throw new Error(
      "Se o telefone estiver cadastrado, você receberá um email de recuperação.",
    );
  }

  // Mesmo que o email não exista, retorna mensagem positiva
  return {
    message:
      "Se o telefone estiver cadastrado, você receberá um email de recuperação.",
  };
}

export async function updatePassword(newPassword) {
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid)
    throw new Error(`Senha fraca: ${passwordValidation.errors.join(", ")}`);

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    if (error.message.includes("session_not_found"))
      throw new Error("Link de recuperação inválido ou expirado.");
    throw new Error(error.message);
  }

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
  if (error) throw new Error(`Supabase error ${status}: ${error.message}`);
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
