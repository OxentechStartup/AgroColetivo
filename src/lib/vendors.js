import { supabase } from './supabase'

// ── VENDORS ───────────────────────────────────────────────────────────────────

export async function fetchVendors() {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, phone, city, notes, created_at')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createVendor(vendor) {
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      name:  vendor.name.trim(),
      phone: vendor.phone.replace(/\D/g, ''),
      city:  vendor.city?.trim() || null,
      notes: vendor.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteVendor(id) {
  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}
