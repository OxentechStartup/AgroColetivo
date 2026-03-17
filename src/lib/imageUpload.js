/**
 * Utilitários de imagem — 100% frontend
 * A imagem é convertida para uma URL de objeto (blob://) no navegador.
 * APENAS essa string de URL é salva no banco. Nada é enviado ao Supabase Storage.
 */

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Valida e converte um arquivo de imagem para uma blob URL.
 * @param {File} file
 * @returns {Promise<string>} blob URL (ex: "blob://…")
 */
export async function createImageUrl(file) {
  if (!file) throw new Error("Nenhum arquivo selecionado");
  if (!isValidImageFile(file))
    throw new Error("Formato não suportado. Use JPG, PNG, WebP ou GIF.");
  if (file.size > MAX_SIZE)
    throw new Error("Imagem muito grande. Máximo: 5 MB.");
  return URL.createObjectURL(file);
}

/** Alias para campanhas */
export const uploadCampaignImage = createImageUrl;

/** Alias para foto de vendor/gestor */
export const uploadVendorPhoto = createImageUrl;

/**
 * Libera a memória da blob URL (chamar quando o componente desmontar
 * ou quando a URL não for mais necessária).
 * @param {string} url
 */
export function revokeImageUrl(url) {
  if (url?.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // silencioso
    }
  }
}

/** Aliases */
export const deleteCampaignImage = revokeImageUrl;
export const deleteVendorPhoto = (url) => {
  revokeImageUrl(url);
  return Promise.resolve();
};

/**
 * Retorna true se o arquivo for uma imagem suportada.
 * @param {File} file
 */
export function isValidImageFile(file) {
  return VALID_TYPES.includes(file?.type);
}
