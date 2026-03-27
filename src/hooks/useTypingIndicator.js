import { useRef, useEffect, useCallback } from "react";
import { useUserPresence } from "./useUserPresence";

/**
 * useTypingIndicator — Detectar e mostrar quando usuário está digitando
 *
 * Exemplo de uso:
 * ```javascript
 * const { onInput } = useTypingIndicator(campaignId);
 *
 * <input
 *   onInput={onInput}
 *   onBlur={() => updateUserPresence("active")}
 * />
 * ```
 */

export function useTypingIndicator(campaignId) {
  const { updateUserPresence } = useUserPresence();
  const typingTimeoutRef = useRef(null);

  // Chamar quando o usuário começa a digitar
  const onInput = useCallback(() => {
    updateUserPresence("typing", campaignId);

    // Limpar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Definir novo timeout para remover status de digitação após 3s de inatividade
    typingTimeoutRef.current = setTimeout(() => {
      updateUserPresence("active", campaignId);
    }, 3000);
  }, [campaignId, updateUserPresence]);

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { onInput };
}
