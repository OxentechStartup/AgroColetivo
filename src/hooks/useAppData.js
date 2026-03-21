import { useContext } from "react";
import AppContext from "../context/AppContext";

/**
 * useAppData — Hook para acessar dados centralizados do AppContext
 *
 * Uso:
 * const { user, campaigns, addOrder } = useAppData();
 */

export function useAppData() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      "❌ useAppData deve ser usado dentro de <AppProvider>. " +
        "Envuelva sua aplicação com AppProvider em App.jsx",
    );
  }

  return context;
}

export default useAppData;
