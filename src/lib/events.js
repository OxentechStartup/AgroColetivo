import { supabase } from "./supabase";

/**
 * Registra um evento no audit log da cotação.
 * Falha silenciosamente — não deve quebrar o fluxo principal.
 */
export async function logEvent(
  campaignId,
  eventType,
  payload = null,
  actorId = null,
) {
  try {
    await supabase.from("campaign_events").insert({
      campaign_id: campaignId,
      actor_id: actorId,
      event_type: eventType,
      payload: payload,
    });
  } catch (e) {
    console.warn(
      "[logEvent] falhou silenciosamente:",
      e?.message || "unknown error",
    );
  }
}

export const EVENT = {
  CAMPAIGN_CREATED: "campaign_created",
  CAMPAIGN_CLOSED: "campaign_closed",
  CAMPAIGN_REOPENED: "campaign_reopened",
  ORDER_SUBMITTED: "order_submitted",
  ORDER_APPROVED: "order_approved",
  ORDER_REJECTED: "order_rejected",
  LOT_ADDED: "lot_added",
  LOT_REMOVED: "lot_removed",
  PRICE_SET: "price_set",
  FREIGHT_SET: "freight_set",
};
