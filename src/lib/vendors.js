import { supabase } from "./supabase";
import { ROLES } from "../constants/roles";

// Busca fornecedores conforme o papel do usuário:
// - admin: todos os fornecedores
// - gestor (pivo): seus próprios + legados (user_id IS NULL)
// - vendor: lista vazia (vendors não devem ver outros vendors)
// - outros roles: lista vazia
export async function fetchVendors(userId, role) {
  let query = supabase
    .from("vendors")
    .select("*, users(id, name, phone, city, role)")
    .order("name", { ascending: true });

  if (role === ROLES.ADMIN) {
    // admin vê todos
  } else if (role === ROLES.GESTOR && userId) {
    // gestor vê todos os fornecedores cadastrados no sistema
    // (tanto os que ele cadastrou quanto os que se registraram pelo app)
  } else {
    // vendor e outros roles não veem vendors cadastrados
    // retorna lista vazia
    return [];
  }

  const { data, error } = await query;
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
      user_id: vendor.user_id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error?.message || "Erro ao criar vendor");
  return { ...data, admin_user_id: data.user_id };
}

export async function updateVendor(id, patch) {
  const { data, error } = await supabase
    .from("vendors")
    .update({
      name: patch.name?.trim(),
      phone: (patch.phone ?? "").replace(/\D/g, ""),
      city: patch.city?.trim() || null,
      notes: patch.notes?.trim() || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error?.message || "Erro ao atualizar vendor");
  return { ...data, admin_user_id: data.user_id };
}

export async function deleteVendor(id, userId, role) {
  // Admin pode deletar qualquer vendor
  // Gestor pode deletar apenas vendors que ele mesmo cadastrou
  let query = supabase.from("vendors").delete().eq("id", id);

  if (role !== ROLES.ADMIN && userId) {
    // Se não é admin, filtra por user_id (gestor só apaga o que criou)
    query = query.eq("user_id", userId);
  }

  const { error } = await query;
  if (error) throw new Error(error?.message || "Erro ao deletar vendor");
}
