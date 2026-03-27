import { createContext } from "react";

/**
 * UserPresenceContext — Gerencia presença de usuários em tempo real
 *
 * Dados:
 * - onlineUsers: array de usuários online
 * - userActivity: mapa de atividades dos usuários
 * - isUserOnline(userId): verifica se usuário está online
 * - updateUserPresence: atualiza presença do usuário
 */

const UserPresenceContext = createContext(null);

export default UserPresenceContext;
