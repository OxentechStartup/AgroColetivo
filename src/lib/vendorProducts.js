import { supabase } from './supabase'

// Tabela: products (id, vendor_id, name, unit, unit_weight_kg, price_per_unit, qty_available, active)
// Tabela: product_promotions (id, product_id, min_qty, promo_type, value, description, active)
// promo_type: 'fixed_discount' | 'percent_discount' | 'fixed_bonus'

export async function fetchVendorProducts(vendorId) {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_promotions(*), vendors(id, name, phone, city)')
    .eq('vendor_id', vendorId)
    .eq('active', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(normalizeProduct)
}


export async function upsertVendorProduct(vendorId, product) {
  const weightKg     = product.weightKg    != null ? Number(product.weightKg)    : 0
  const pricePerUnit = product.pricePerUnit != null ? Number(product.pricePerUnit) : null
  const pricePerKg   = product.pricePerKg  != null ? Number(product.pricePerKg)  : null

  const resolvedPrice = pricePerUnit ?? (pricePerKg && weightKg ? +(pricePerKg * weightKg).toFixed(2) : null)

  const payload = {
    vendor_id:      vendorId,
    name:           product.name.trim(),
    description:    product.description?.trim() || null,
    unit:           product.unit,
    unit_weight_kg: weightKg,
    price_per_unit: resolvedPrice,
    qty_available:  Number(product.stockQty),
    active:         true,
  }

  if (product.id) {
    const { data, error } = await supabase.from('products').update(payload).eq('id', product.id).select().single()
    if (error) throw new Error(error.message)
    return normalizeProduct(data)
  } else {
    const { data, error } = await supabase.from('products').insert(payload).select().single()
    if (error) throw new Error(error.message)
    return normalizeProduct(data)
  }
}

export async function softDeleteVendorProduct(id) {
  const { error } = await supabase.from('products').update({ active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}


// ── Promoções ─────────────────────────────────────────────────────────────────
// promo_type: 'percent_discount' ou 'fixed_discount'
export async function addPromotion(productId, promo) {
  const promoType = promo.discountType === 'percent' ? 'percent_discount' : 'fixed_discount'
  const { data, error } = await supabase
    .from('product_promotions')
    .insert({ product_id: productId, min_qty: Number(promo.minQty), promo_type: promoType, value: Number(promo.discountValue), description: promo.description?.trim() || null })
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deletePromotion(id) {
  const { error } = await supabase.from('product_promotions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function calcDiscountedPrice(basePrice, qty, promotions = []) {
  const eligible = promotions
    .filter(p => qty >= Number(p.min_qty) && (p.active ?? true))
    .map(p => {
      const disc = (p.promo_type === 'percent_discount' || p.discount_type === 'percent')
        ? basePrice * (Number(p.value ?? p.discount_value) / 100)
        : Number(p.value ?? p.discount_value)
      return { ...p, discountPerUnit: disc }
    })
    .sort((a, b) => b.discountPerUnit - a.discountPerUnit)

  if (!eligible.length) return { finalPrice: basePrice, discount: 0, promoUsed: null }
  const best = eligible[0]
  return { finalPrice: Math.max(0, basePrice - best.discountPerUnit), discount: best.discountPerUnit, promoUsed: best }
}

function normalizeProduct(row) {
  const weight = Number(row.unit_weight_kg ?? 0)
  const price  = row.price_per_unit != null ? Number(row.price_per_unit) : null
  return {
    id:           row.id,
    vendorId:     row.vendor_id,
    name:         row.name,
    category:     row.category ?? null,
    unit:         row.unit,
    weightKg:     weight || null,
    pricePerUnit: price,
    pricePerKg:   price && weight ? +(price / weight).toFixed(4) : null,
    stockQty:     Number(row.qty_available ?? 0),
    description:  row.description ?? null,
    freightType:  'A_COMBINAR',
    paymentTerms: 'A combinar',
    active:       row.active ?? true,
    createdAt:    row.created_at,
    promotions:   (row.product_promotions ?? []),
    vendor:       row.vendors ?? null,
  }
}
