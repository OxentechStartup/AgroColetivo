import { supabase } from "./supabase.js";

// ── PRODUTOS (cadastrados pelos vendedores) ───────────────────────────────────

export async function fetchVendorProducts(vendorId) {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_promotions(*)")
    .eq("vendor_id", vendorId)
    .eq("active", true)
    .order("name", { ascending: true });
  if (error)
    throw new Error(
      "Erro ao buscar produtos: " + (error?.message || "Erro desconhecido"),
    );
  return data.map(normalizeProduct);
}

export async function fetchAllProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*, vendors(id,name), product_promotions(*)")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error)
    throw new Error(
      "Erro ao buscar produtos: " + (error?.message || "Erro desconhecido"),
    );
  return data.map(normalizeProduct);
}

export async function createProduct(vendorId, p) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      vendor_id: vendorId,
      name: p.name.trim(),
      description: p.description?.trim() || null,
      unit: p.unit,
      unit_weight_kg: Number(p.unitWeightKg) || 0,
      price_per_unit: Number(p.pricePerUnit),
      qty_available: Number(p.qtyAvailable) || 0,
    })
    .select("*, product_promotions(*)")
    .single();
  if (error)
    throw new Error(
      "Erro ao criar produto: " + (error?.message || "unknown error"),
    );
  return normalizeProduct(data);
}

export async function updateProduct(productId, p) {
  const patch = {};
  if (p.name != null) patch.name = p.name.trim();
  if (p.description != null) patch.description = p.description.trim() || null;
  if (p.unit != null) patch.unit = p.unit;
  if (p.unitWeightKg != null) patch.unit_weight_kg = Number(p.unitWeightKg);
  if (p.pricePerUnit != null) patch.price_per_unit = Number(p.pricePerUnit);
  if (p.qtyAvailable != null) patch.qty_available = Number(p.qtyAvailable);
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .select("*, product_promotions(*)")
    .single();
  if (error)
    throw new Error(
      "Erro ao atualizar produto: " + (error?.message || "unknown error"),
    );
  return normalizeProduct(data);
}

export async function deleteProduct(productId) {
  const { error } = await supabase
    .from("products")
    .update({ active: false })
    .eq("id", productId);
  if (error)
    throw new Error(
      "Erro ao remover produto: " + (error?.message || "unknown error"),
    );
}

// ── PROMOÇÕES ─────────────────────────────────────────────────────────────────

export async function addPromotion(productId, promo) {
  const { data, error } = await supabase
    .from("product_promotions")
    .insert({
      product_id: productId,
      min_qty: Number(promo.minQty),
      promo_type: promo.promoType, // 'fixed_discount' | 'percent_discount' | 'fixed_bonus'
      value: Number(promo.value),
      description: promo.description?.trim() || null,
    })
    .select()
    .single();
  if (error)
    throw new Error(
      "Erro ao criar promoção: " + (error?.message || "unknown error"),
    );
  return normalizePromo(data);
}

export async function removePromotion(promoId) {
  const { error } = await supabase
    .from("product_promotions")
    .delete()
    .eq("id", promoId);
  if (error)
    throw new Error(
      "Erro ao remover promoção: " + (error?.message || "unknown error"),
    );
}

// ── CALCULAR DESCONTO APLICÁVEL ───────────────────────────────────────────────
// Dado uma lista de promoções e a quantidade, retorna o melhor desconto ativo
export function calcBestPromotion(promotions = [], qty) {
  const eligible = promotions
    .filter((p) => p.active && qty >= p.minQty)
    .sort((a, b) => b.minQty - a.minQty); // maior threshold primeiro

  if (!eligible.length) return null;
  return eligible[0];
}

export function applyPromotion(promo, totalValue) {
  if (!promo) return { discount: 0, finalValue: totalValue };
  let discount = 0;
  if (promo.promoType === "fixed_discount") {
    discount = promo.value;
  } else if (promo.promoType === "percent_discount") {
    discount = totalValue * (promo.value / 100);
  } else if (promo.promoType === "fixed_bonus") {
    discount = promo.value;
  }
  return {
    discount,
    finalValue: Math.max(0, totalValue - discount),
    label: promoLabel(promo),
  };
}

export function promoLabel(promo) {
  if (!promo) return "";
  const trigger = `acima de ${promo.minQty} un.`;
  if (promo.promoType === "percent_discount")
    return `${promo.value}% de desconto (${trigger})`;
  if (promo.promoType === "fixed_discount")
    return `R$ ${promo.value.toFixed(2)} de desconto (${trigger})`;
  if (promo.promoType === "fixed_bonus")
    return `Bônus de R$ ${promo.value.toFixed(2)} (${trigger})`;
  return promo.description || "";
}

// ── NORMALIZE ─────────────────────────────────────────────────────────────────

function normalizeProduct(r) {
  return {
    id: r.id,
    vendorId: r.vendor_id,
    vendorName: r.vendors?.name ?? null,
    name: r.name,
    description: r.description,
    unit: r.unit,
    unitWeightKg: Number(r.unit_weight_kg),
    pricePerUnit: Number(r.price_per_unit),
    qtyAvailable: Number(r.qty_available),
    active: r.active,
    createdAt: r.created_at?.slice(0, 10),
    promotions: (r.product_promotions ?? []).map(normalizePromo),
  };
}

function normalizePromo(r) {
  return {
    id: r.id,
    productId: r.product_id,
    minQty: Number(r.min_qty),
    promoType: r.promo_type,
    value: Number(r.value),
    description: r.description,
    active: r.active,
    createdAt: r.created_at?.slice(0, 10),
  };
}
