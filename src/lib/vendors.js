import { supabase } from "./supabase";
import { ROLES } from "../constants/roles";
// As funções de imagem foram centralizadas em imageUpload.js
export { uploadVendorPhoto, deleteVendorPhoto } from "./imageUpload";

// Busca fornecedores conforme o papel do usuário:
// - admin: todos os fornecedores
// - gestor (pivo): todos os fornecedores cadastrados no sistema
// - vendor: lista vazia (vendors não devem ver outros vendors)
export async function fetchVendors(userId, role) {
  if (role !== ROLES.ADMIN && role !== ROLES.GESTOR) return [];

  const { data, error } = await supabase
    .from("vendors")
    .select("*, users(id, name, phone, city, role)")
    .order("name", { ascending: true });

  if (error) throw new Error(error?.message || "Erro ao buscar vendors");
  return (data ?? []).map((v) => ({
    ...v,
    admin_user_id: v.user_id,
    company_name: v.users?.name ?? v.name,
  }));
}

export async function createVendor(vendor) {
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      name: vendor.name.trim(),
      phone: (vendor.phone ?? "").replace(/\D/g, ""),
      city: vendor.city?.trim() || null,
      notes: vendor.notes?.trim() || null,
      photo_url: vendor.photo_url || null,
      user_id: vendor.user_id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error?.message || "Erro ao criar vendor");
  return { ...data, admin_user_id: data.user_id };
}

export async function updateVendor(id, patch) {
  const payload = {
    name: patch.name?.trim(),
    phone: (patch.phone ?? "").replace(/\D/g, ""),
    city: patch.city?.trim() || null,
    notes: patch.notes?.trim() || null,
  };
  // Só inclui photo_url se foi explicitamente passado
  if (patch.photo_url !== undefined) {
    payload.photo_url = patch.photo_url;
  }

  const { data, error } = await supabase
    .from("vendors")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error?.message || "Erro ao atualizar vendor");
  return { ...data, admin_user_id: data.user_id };
}

export async function deleteVendor(id, userId, role) {
  let query = supabase.from("vendors").delete().eq("id", id);
  // Gestor só apaga o que ele mesmo criou
  if (role !== ROLES.ADMIN && userId) {
    query = query.eq("user_id", userId);
  }
  const { error } = await query;
  if (error) throw new Error(error?.message || "Erro ao deletar vendor");
}
