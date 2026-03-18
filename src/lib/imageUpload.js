/**
 * Utilitários de imagem — 100% frontend
 * A imagem é convertida para Data URI (base64) que persiste no banco.
 * APENAS essa string é salva no banco. Nada é enviado ao Supabase Storage.
 */

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10 MB (limite de base64)
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MIN_WIDTH = 100; // pixels
const MIN_HEIGHT = 100; // pixels

/**
 * Valida e converte um arquivo de imagem para uma Data URI (base64).
 * Faz validações: tipo, tamanho, dimensões mínimas, disponibilidade de FileReader
 * @param {File} file
 * @returns {Promise<string>} Data URI (ex: "data:image/jpeg;base64,/9j/4AAQSkZJRg…")
 */
export async function createImageUrl(file) {
  // === Validação 1: Arquivo existe ===
  if (!file) throw new Error("Nenhum arquivo selecionado");

  // === Validação 2: FileReader disponível ===
  if (typeof FileReader === "undefined") {
    throw new Error("Seu navegador não suporta upload de imagens");
  }

  // === Validação 3: Tipo MIME válido ===
  if (!isValidImageFile(file)) {
    throw new Error("Formato não suportado. Use JPG, PNG, WebP ou GIF");
  }

  // === Validação 4: Tamanho do arquivo ===
  if (file.size === 0) {
    throw new Error("Arquivo está vazio");
  }
  if (file.size > MAX_SIZE) {
    throw new Error(
      `Imagem muito grande. Máximo: ${MAX_SIZE / 1024 / 1024}MB. Sua imagem: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    );
  }

  // === Validação 5: Dimensões mínimas da imagem ===
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result;

        // Validação 5a: Data URL resultante não é muito grande
        if (dataUrl.length > MAX_BASE64_SIZE) {
          throw new Error(
            "Erro: Imagem codificada é muito grande para armazenar",
          );
        }

        // Validação 5b: Validar dimensões da imagem
        const img = new Image();
        img.onload = () => {
          if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
            reject(
              new Error(
                `Imagem muito pequena. Mínimo: ${MIN_WIDTH}x${MIN_HEIGHT}px. Sua imagem: ${img.width}x${img.height}px`,
              ),
            );
            return;
          }
          resolve(dataUrl);
        };
        img.onerror = () => {
          reject(new Error("Imagem corrompida ou inválida"));
        };
        img.src = dataUrl;
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      const errorMsg =
        reader.error?.name === "NotReadableError"
          ? "Arquivo não legível"
          : "Erro ao ler arquivo";
      reject(new Error(errorMsg));
    };

    reader.onabort = () => {
      reject(new Error("Leitura do arquivo cancelada"));
    };

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
  if (!file) return false;
  return VALID_TYPES.includes(file.type);
}

/**
 * Limpa uma Data URI de imagem (útil para liberar memória)
 * @param {string} dataUrl
 */
export function clearImageUrl(dataUrl) {
  // Em teoria, você pode fazer URL.createObjectURL e depois revokeObjectURL
  // Mas como estamos usando data URLs, apenas retornar null é suficiente
  return null;
}
