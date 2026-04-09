// Helper para gerenciar Supabase Realtime Subscriptions
import { supabase } from "./supabase.js";

/**
 * Subscribe a mudanças em uma tabela do Supabase
 * @param {string} tableName - Nome da tabela (ex: "orders", "campaigns")
 * @param {function} callback - Função chamada quando há mudanças
 * @param {object} options - Opções { filter, event }
 */
export function subscribeToTable(tableName, callback, options = {}) {
  const { filter = "", event = "*" } = options;

  const subscription = supabase
    .channel(`${tableName}_changes`)
    .on(
      "postgres_changes",
      {
        event: event,
        schema: "public",
        table: tableName,
        ...(filter && { filter }),
      },
      (payload) => {
        callback(payload);
      },
    )
    .subscribe();

  // Retorna função para cleanup
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Subscribe a notificações para um gestor específico
 * @param {string} pivoId - UUID do gestor
 * @param {function} callback - Função chamada quando há novas notificações
 */
export function subscribeToNotifications(pivoId, callback) {
  return subscribeToTable("notifications", callback, {
    filter: `pivo_id=eq.${pivoId}`,
    event: "INSERT",
  });
}

/**
 * Subscribe a mudanças de ofertas de uma campanha
 * @param {string} campaignId - UUID da campanha
 * @param {function} callback - Função chamada quando há mudanças
 */
export function subscribeToCampaignOffers(campaignId, callback) {
  return subscribeToTable("vendor_campaign_offers", callback, {
    filter: `campaign_id=eq.${campaignId}`,
    event: "*",
  });
}

/**
 * Subscribe a mudanças de ofertas de um vendor
 * @param {string} vendorId - UUID do vendor
 * @param {function} callback - Função chamada quando há mudanças
 */
export function subscribeToVendorOffers(vendorId, callback) {
  return subscribeToTable("vendor_campaign_offers", callback, {
    filter: `vendor_id=eq.${vendorId}`,
    event: "*",
  });
}

/**
 * Subscribe a mudanças de pedidos
 * @param {string} buyerId - UUID do comprador
 * @param {function} callback - Função chamada quando há mudanças
 */
export function subscribeToBuyerOrders(buyerId, callback) {
  return subscribeToTable("orders", callback, {
    filter: `buyer_id=eq.${buyerId}`,
    event: "*",
  });
}

/**
 * Subscribe a mudanças de campanhas
 * @param {function} callback - Função chamada quando há mudanças
 * @param {object} options - Opções { pivoId }
 */
export function subscribeToCampaigns(callback, options = {}) {
  const filter = options.pivoId ? `pivo_id=eq.${options.pivoId}` : "";
  return subscribeToTable("campaigns", callback, {
    filter,
    event: "*",
  });
}
