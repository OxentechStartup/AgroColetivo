import { supabase } from "./supabase";

/**
 * Upload de imagem para Supabase Storage
 * Retorna apenas a URL da imagem, nunca o arquivo
 */
export async function uploadCampaignImage(file) {
  if (!file) throw new Error("Nenhum arquivo selecionado");

  // Validação de tamanho (5 MB)
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) {
    throw new Error(`Imagem muito grande. Máximo: 5 MB`);
  }

  // Gerar nome único
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const fileName = `campaign-${timestamp}-${random}`;
  const filePath = `campaigns/${fileName}`;

  // Upload para Supabase Storage
  const { data, error } = await supabase.storage
    .from("public")
    .upload(filePath, file);

  if (error) {
    console.error("Erro no upload:", error);
    throw new Error("Erro ao fazer upload da imagem");
  }

  // Retornar URL pública
  const { data: publicData } = supabase.storage
    .from("public")
    .getPublicUrl(filePath);

  if (!publicData?.publicUrl) {
    throw new Error("Erro ao gerar URL pública");
  }

  return publicData.publicUrl;
}

/**
 * Validar se arquivo é imagem
 */
export function isValidImageFile(file) {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ];
  return validTypes.includes(file.type);
}

/**
 * Deletar imagem do Supabase Storage
 */
export async function deleteCampaignImage(imageUrl) {
  if (!imageUrl) return;

  try {
    // Extrair caminho do arquivo da URL
    // Formato: https://...supabase.co/storage/v1/object/public/public/campaigns/campaign-1234-5678
    const urlParts = imageUrl.split("/public/");
    if (urlParts.length < 2) return;

    const filePath = urlParts[1];

    await supabase.storage.from("public").remove([filePath]);
  } catch (e) {
    console.error("Erro ao deletar imagem:", e);
    // Não lançar erro - logging apenas
  }
}
