/**
 * Utilitários de imagem — 100% frontend
 * A imagem é convertida para Data URI (base64) que persiste no banco.
 * APENAS essa string é salva no banco. Nada é enviado ao Supabase Storage.
 */

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Valida e converte um arquivo de imagem para uma Data URI (base64).
 * @param {File} file
 * @returns {Promise<string>} Data URI (ex: "data:image/jpeg;base64,/9j/4AAQSkZJRg…")
 */
export async function createImageUrl(file) {
  if (!file) throw new Error("Nenhum arquivo selecionado");
  if (!isValidImageFile(file))
    throw new Error("Formato não suportado. Use JPG, PNG, WebP ou GIF.");
  if (file.size > MAX_SIZE)
    throw new Error("Imagem muito grande. Máximo: 5 MB.");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // Data URI
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

/** Alias para campanhas */
export const uploadCampaignImage = createImageUrl;

/** Alias para foto de vendor/gestor */
export const uploadVendorPhoto = createImageUrl;

/**
 * Retorna true se o arquivo for uma imagem suportada.
 * @param {File} file
 */
export function isValidImageFile(file) {
  return VALID_TYPES.includes(file?.type);
}
