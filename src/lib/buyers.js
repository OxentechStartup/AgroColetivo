import { supabase } from "./supabase";
import { logSecurityEvent } from "./authorization";

// ── BUYERS (fazendeiros/compradores) ──────────────────────────────────────────
// Identificados por telefone — sem senha (acesso via link).
// O sistema os reconhece automaticamente nas próximas cotações.

// SEGURANÇA: rate limit client-side para portal anon (complementa o server-side)
// Chave: phone → { count, windowStart }
const _portalRateCache = new Map();
const PORTAL_MAX = 5; // max pedidos por telefone
const PORTAL_WINDOW = 60 * 60 * 1000; // 1 hora em ms

function checkPortalRateLimit(phone) {
  const now = Date.now();
  const entry = _portalRateCache.get(phone);
  if (!entry || now - entry.windowStart > PORTAL_WINDOW) {
    _portalRateCache.set(phone, { count: 1, windowStart: now });
    return true; // permitido
  }
  if (entry.count >= PORTAL_MAX) return false; // bloqueado
  entry.count++;
  return true; // permitido
}

export async function findOrCreateBuyer(name, phone) {
  const cleanPhone = phone.replace(/\D/g, "");

  // Rate limit client-side (complementa a função SQL)
  if (!checkPortalRateLimit(cleanPhone)) {
    await logSecurityEvent(
      "portal_rate_limit",
      null,
      "buyers",
      null,
      `phone=${cleanPhone} blocked=client`,
    );
    throw new Error(
      "Muitos pedidos em pouco tempo. Tente novamente em 1 hora.",
    );
  }

  // Tenta encontrar pelo telefone
  const { data: existing } = await supabase
    .from("buyers")
    .select("id, name, phone, city")
    .eq("phone", cleanPhone)
    .maybeSingle();

  if (existing) return existing;

  // Cria novo buyer — a função SQL find_or_create_buyer faz rate limit server-side
  const { data, error } = await supabase
    .from("buyers")
    .insert({ name: name.trim(), phone: cleanPhone })
    .select()
    .single();

  if (error)
    throw new Error(
      "Erro ao cadastrar comprador: " + (error?.message || "unknown error"),
    );
  return data;
}

export async function fetchBuyerHistory(phone) {
  const cleanPhone = phone.replace(/\D/g, "");
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id, qty, status, submitted_at,
      campaigns (id, product, unit, status, deadline),
      buyers!inner (name, phone)
    `,
    )
    .eq("buyers.phone", cleanPhone)
    .neq("status", "rejected")
    .order("submitted_at", { ascending: false });
  if (error)
    throw new Error(
      "Erro ao buscar histórico: " + (error?.message || "unknown error"),
    );
  return data;
}

export async function getBuyerByPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, "");
  const { data } = await supabase
    .from("buyers")
    .select("id, name, phone, city")
    .eq("phone", cleanPhone)
    .maybeSingle();
  return data ?? null;
}

export async function fetchBuyers() {
  const { data, error } = await supabase
    .from("buyers")
    .select("id, name, phone, city, created_at")
    .order("name", { ascending: true });
  if (error)
    throw new Error(
      "Erro ao buscar compradores: " + (error?.message || "unknown error"),
    );
  return data;
}

// Legado
export const findOrCreateProducer = findOrCreateBuyer;
export const fetchProducerCosts = async () => {
  const { data, error } = await supabase
    .from("v_producer_costs")
    .select("*")
    .order("producer_name", { ascending: true });
  if (error)
    throw new Error(
      "Erro ao buscar custos: " + (error?.message || "unknown error"),
    );
  return data;
};
