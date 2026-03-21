import { supabase } from "./supabase";

const pivoCache = new Map();

export async function fetchPivoData(pivoId) {
  if (!pivoId) return null;

  // Verificar cache primeiro
  if (pivoCache.has(pivoId)) {
    return pivoCache.get(pivoId);
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, profile_photo_url")
      .eq("id", pivoId)
      .maybeSingle();

    if (error) {
      return null;
    }

    // Armazenar no cache
    if (data) {
      pivoCache.set(pivoId, data);
    }

    return data;
  } catch (error) {
    return null;
  }
}

export function clearPivoCache() {
  pivoCache.clear();
}

export function getPivoFromCache(pivoId) {
  return pivoCache.has(pivoId) ? pivoCache.get(pivoId) : null;
}
