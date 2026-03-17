import { supabase } from "./supabase";
import { ROLES } from "../constants/roles";

/**
 * Converte a imagem selecionada para uma URL no frontend
 * Apenas a URL é armazenada no banco de dados (photo_url text/varchar)
 * NADA é enviado para Supabase - a imagem fica no navegador do usuário
 */
export async function uploadVendorPhoto(file) {
  if (!file) throw new Error("Nenhum arquivo selecionado");

  // Validação de tamanho (5 MB)
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) {
    throw new Error("Imagem muito grande. Máximo: 5 MB");
  }

  // Validação de tipo
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Formato não suportado. Use JPG, PNG ou WebP");
  }

  // Converter arquivo para URL do navegador (blob:// URL)
  // Apenas a URL string é retornada - NADA é enviado para Supabase
  const url = URL.createObjectURL(file);
  return url;
}

/**
 * Limpar URL do navegador (liberar memória)
 */
export function deleteVendorPhoto(photoUrl) {
  if (!photoUrl) return Promise.resolve();

  try {
    // Se for uma blob:// URL, revoga o objeto
    if (photoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(photoUrl);
    }
  } catch (e) {
    console.error("Erro ao limpar foto:", e);
  }

  return Promise.resolve();
}

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
      photo_url: vendor.photo_url || null,
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
      photo_url: patch.photo_url !== undefined ? patch.photo_url : undefined,
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
