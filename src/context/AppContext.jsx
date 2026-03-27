import { createContext } from "react";

/**
 * AppContext — Contexto centralizado do sistema
 * 
 * Gerencia dados em tempo real para os 3 tipos de usuários:
 * - VENDOR (Fornecedor)
 * - GESTOR (Gerenciador de campanhas)
 * - BUYER (Comprador/Produtor)
 */

export const AppContext = createContext(null);

export default AppContext;
