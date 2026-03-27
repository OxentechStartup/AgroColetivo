import { useContext } from "react";
import UserPresenceContext from "../context/UserPresenceContext";

/**
 * useUserPresence — Acessar dados de presença de usuários
 *
 * Exemplo de uso:
 * ```javascript
 * const { onlineUsers, isUserOnline, updateUserPresence } = useUserPresence();
 * ```
 */

export function useUserPresence() {
  const context = useContext(UserPresenceContext);

  if (!context) {
    throw new Error(
      "useUserPresence deve ser usado dentro de UserPresenceProvider",
    );
  }

  return context;
}
