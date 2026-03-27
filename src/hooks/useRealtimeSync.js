import { useEffect, useCallback } from "react";
import { useAppData } from "./useAppData";
import { useUserPresence } from "./useUserPresence";

/**
 * useRealtimeSync — Sincronizar dados em tempo real automaticamente
 *
 * Este hook facilita a sincronização de dados entre múltiplos usuários
 * conectados ao mesmo tempo.
 *
 * Exemplo de uso:
 * ```javascript
 * const MyComponent = () => {
 *   useRealtimeSync("campaignId-123", () => {
 *     // Callback executado quando há mudanças
 *     console.log("Dados sincronizados!");
 *   });
 *
 *   return <div>Conteúdo...</div>;
 * };
 * ```
 */

export function useRealtimeSync(campaignId, onSync, dependencies = []) {
  const { reloadCampaign, realTimeActive } = useAppData();
  const { updateUserPresence, recordActivity } = useUserPresence();

  // Configurar presença do usuário na campanha
  useEffect(() => {
    if (campaignId && realTimeActive) {
      updateUserPresence("active", campaignId);
      recordActivity("view_campaign", campaignId, { timestamp: Date.now() });
    }
  }, [campaignId, realTimeActive, updateUserPresence, recordActivity]);

  // Sincronizar dados quando há mudanças
  const sync = useCallback(async () => {
    if (campaignId) {
      await reloadCampaign(campaignId);
      recordActivity("data_sync", campaignId, { timestamp: Date.now() });
      onSync?.();
    }
  }, [campaignId, reloadCampaign, recordActivity, onSync]);

  useEffect(() => {
    const handleVendorsChanged = (e) => {
      if (e.detail?.new?.id || e.detail?.old?.id) {
        sync();
      }
    };

    window.addEventListener("vendors-changed", handleVendorsChanged);
    return () => {
      window.removeEventListener("vendors-changed", handleVendorsChanged);
    };
  }, [sync]);

  return { sync, isRealTimeActive: realTimeActive };
}
