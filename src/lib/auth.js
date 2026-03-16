import { supabase } from "./supabase";
import { ROLES } from "../constants/roles";
import {
  validatePhone,
  validatePassword,
  loginLimiter,
  registerLimiter,
  detectSQLInjection,
  detectXSS,
} from "../utils/security";

export async function login(phone, password) {
  // Valida entrada
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) throw new Error(phoneValidation.error);

  // Detecta SQL Injection
  if (detectSQLInjection(phone) || detectSQLInjection(password)) {
    throw new Error("Segurança: Padrão malicioso detectado");
  }

  const clean = phoneValidation.clean;

  // Rate limiting
  const limiter = loginLimiter.check(clean);
  if (!limiter.allowed) {
    throw new Error(
      `Muitas tentativas. Tente novamente em ${limiter.retryAfter}s`,
    );
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, phone, role, city, notes, active")
    .eq("phone", clean)
    .eq("password_hash", password)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Telefone ou senha incorretos.");

  const { active, ...rest } = data;

  // Se for vendor, tenta linkar ao registro vendors existente por phone ou user_id
  if (rest.role === "vendor") {
    // Primeiro tenta pelo user_id
    let { data: vRow } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", rest.id)
      .maybeSingle();

    // Se não achou pelo user_id, tenta pelo phone (vendor cadastrado pelo gestor)
    if (!vRow) {
      const { data: vByPhone } = await supabase
        .from("vendors")
        .select("id")
        .eq("phone", clean)
        .is("user_id", null)
        .maybeSingle();
      if (vByPhone) {
        // Linka o vendor ao user
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

export async function register(phone, password, role, extra = {}) {
  // Validações
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) throw new Error(phoneValidation.error);

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(`Senha fraca: ${passwordValidation.errors.join(", ")}`);
  }

  // Detecta intrusão
  if (detectSQLInjection(phone) || detectSQLInjection(password)) {
    throw new Error("Segurança: Padrão malicioso detectado");
  }
  if (
    detectXSS(extra.company_name) ||
    detectXSS(extra.city) ||
    detectXSS(extra.notes)
  ) {
    throw new Error("Segurança: Entrada inválida detectada");
  }

  const clean = phoneValidation.clean;

  // Rate limiting
  const limiter = registerLimiter.check(clean);
  if (!limiter.allowed) {
    throw new Error("Muitas tentativas de registro. Tente novamente depois");
  }

  const { data: ex, error: exError } = await supabase
    .from("users")
    .select("id")
    .eq("phone", clean)
    .maybeSingle();
  if (ex) throw new Error("Este telefone já está cadastrado.");

  const name = extra.company_name?.trim() || `Usuário ${clean.slice(-4)}`;

  const { data, error } = await supabase
    .from("users")
    .insert({
      name,
      phone: clean,
      password_hash: password,
      role,
      city: extra.city?.trim() || null,
      notes: extra.notes?.trim() || null,
    })
    .select("id, name, phone, role, city, notes")
    .single();
  if (error) throw new Error("Erro ao criar conta: " + error.message);

  if (role === ROLES.VENDOR) {
    await supabase
      .from("vendors")
      .insert({
        user_id: data.id,
        name,
        phone: clean,
        city: extra.city?.trim() || null,
        notes: extra.notes?.trim() || null,
      })
      .maybeSingle();
  }

  return data;
}

export function getSession() {
  try {
    const s = sessionStorage.getItem("agro_session");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function saveSession(user) {
  sessionStorage.setItem("agro_session", JSON.stringify(user));
}
export function clearSession() {
  sessionStorage.removeItem("agro_session");
}

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
  console.log("[setGestorActive] chamando update", { userId, active });
  const { data, error, status } = await supabase
    .from("users")
    .update({ active })
    .eq("id", userId)
    .select("id, active");
  console.log("[setGestorActive] resultado", { data, error, status });
  if (error) throw new Error(`Supabase error ${status}: ${error.message}`);
  if (!data || data.length === 0) throw new Error("Update retornou 0 linhas.");

  if (!active) {
    const { data: camps } = await supabase
      .from("campaigns")
      .select("id")
      .eq("pivo_id", userId)
      .in("status", ["open", "negotiating"]);
    if (camps?.length) {
      await supabase
        .from("campaigns")
        .update({ status: "closed" })
        .in(
          "id",
          camps.map((c) => c.id),
        );
    }
  }
}
