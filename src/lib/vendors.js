import { supabase } from './supabase'

export async function fetchVendors() {
  const { data, error } = await supabase
    .from('vendors')
    .select('*, users(id, name, phone, city, role)')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(v => ({
    ...v,
    admin_user_id: v.user_id,          // alias para compatibilidade com código existente
    company_name:  v.users?.name ?? v.name,
  }))
}

export async function createVendor(vendor) {
  const { data, error } = await supabase
    .from('vendors')
    .insert({ name: vendor.name.trim(), phone: (vendor.phone ?? '').replace(/\D/g, ''), city: vendor.city?.trim() || null, notes: vendor.notes?.trim() || null, user_id: vendor.user_id ?? null })
    .select().single()
  if (error) throw new Error(error.message)
  return { ...data, admin_user_id: data.user_id }
}

export async function updateVendor(id, patch) {
  const { data, error } = await supabase
    .from('vendors')
    .update({ name: patch.name?.trim(), phone: (patch.phone ?? '').replace(/\D/g, ''), city: patch.city?.trim() || null, notes: patch.notes?.trim() || null })
    .eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return { ...data, admin_user_id: data.user_id }
}

export async function deleteVendor(id) {
  const { error } = await supabase.from('vendors').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
