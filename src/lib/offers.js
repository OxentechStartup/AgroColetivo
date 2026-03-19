import { supabase } from "./supabase.js";

// Busca todas as ofertas de uma cotacao
export async function fetchOffers(campaignId) {
  const { data, error } = await supabase
    .from("vendor_campaign_offers")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("price_per_unit", { ascending: true });
  if (error)
    throw new Error(
      "Erro ao buscar ofertas: " + (error?.message || "Erro desconhecido"),
    );

  // Buscar dados dos vendors separadamente
  if (data && data.length > 0) {
    const vendorIds = [...new Set(data.map((o) => o.vendor_id))];
    const { data: vendors } = await supabase
      .from("vendors")
      .select("id, name, phone, city")
      .in("id", vendorIds);

    const vendorMap = {};
    (vendors ?? []).forEach((v) => {
      vendorMap[v.id] = v;
    });

    return data.map((o) => ({
      ...normalizeOffer(o),
      vendors: vendorMap[o.vendor_id] || null,
    }));
  }

  return (data ?? []).map(normalizeOffer);
}

// Fornecedor envia uma oferta
export async function createOffer(campaignId, vendorId, offer) {
  // Remove oferta anterior do mesmo vendor nessa campanha
  await supabase
    .from("vendor_campaign_offers")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("vendor_id", vendorId);

  const { data, error } = await supabase
    .from("vendor_campaign_offers")
    .insert({
      campaign_id: campaignId,
      vendor_id: vendorId,
      price_per_unit: Number(offer.pricePerUnit),
      available_qty: Number(offer.availableQty),
      notes: offer.notes || null,
      status: "pending",
    })
    .select()
    .single();
  if (error)
    throw new Error(
      "Erro ao enviar oferta: " + (error?.message || "Erro desconhecido"),
    );
  // insert retorna apenas os campos da tabela — normaliza sem join de vendor
  return {
    id: data.id,
    campaignId: data.campaign_id,
    vendorId: data.vendor_id,
    vendorName: "Fornecedor",
    vendorCity: null,
    vendorPhone: null,
    pricePerUnit: Number(data.price_per_unit),
    availableQty: Number(data.available_qty),
    notes: data.notes,
    status: data.status ?? "pending",
    createdAt: data.created_at?.slice(0, 10),
  };
}

// Gestor aceita uma oferta (cria o lote a partir dela).
// Retorna { fulfilled: bool, remaining: number } para o chamador.
export async function acceptOffer(offerId) {
  const { error } = await supabase
    .from("vendor_campaign_offers")
    .update({ status: "accepted" })
    .eq("id", offerId);
  if (error) throw new Error(error?.message || "Erro ao aceitar oferta");
}

export async function rejectOffer(offerId) {
  const { error } = await supabase
    .from("vendor_campaign_offers")
    .update({ status: "rejected" })
    .eq("id", offerId);
  if (error) throw new Error(error?.message || "Erro ao rejeitar oferta");
}

/**
 * Chamado pelo gestor DEPOIS de acceptOffer + createLot.
 * - Calcula quanto da demanda ainda falta cobrir.
 * - Se demanda 100% coberta: rejeita todas as outras propostas pendentes.
 * - Se parcialmente coberta: atualiza goal_qty da campanha para o restante
 *   e rejeita só as propostas cuja quantidade seja maior que o restante
 *   (ou seja, deixa passar quem ainda pode atender o que falta).
 * Retorna { fulfilled: boolean, remaining: number }
 */
export async function settleOffersAfterAccept(
  campaignId,
  acceptedOfferId,
  acceptedQty,
) {
  // 1. Busca demanda total aprovada da campanha
  const { data: orders, error: ordErr } = await supabase
    .from("orders")
    .select("qty")
    .eq("campaign_id", campaignId)
    .eq("status", "approved");
  if (ordErr)
    throw new Error(
      "Erro ao buscar pedidos: " + (ordErr?.message || "Erro desconhecido"),
    );
  const totalDemand = (orders ?? []).reduce((s, o) => s + Number(o.qty), 0);

  // 2. Soma de todos os lotes já aceitos (incluindo o recém-criado)
  const { data: lots, error: lotErr } = await supabase
    .from("campaign_lots")
    .select("qty_available")
    .eq("campaign_id", campaignId);
  if (lotErr)
    throw new Error(
      "Erro ao buscar lotes: " + (lotErr?.message || "Erro desconhecido"),
    );
  const totalSupplied = (lots ?? []).reduce(
    (s, l) => s + Number(l.qty_available),
    0,
  );

  const remaining = Math.max(0, totalDemand - totalSupplied);
  const fulfilled = remaining === 0;

  // 3. Busca demais propostas pendentes (exceto a que acabou de ser aceita)
  const { data: pending, error: pendErr } = await supabase
    .from("vendor_campaign_offers")
    .select("id, available_qty")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .neq("id", acceptedOfferId);
  if (pendErr)
    throw new Error(
      "Erro ao buscar propostas pendentes: " +
        (pendErr?.message || "Erro desconhecido"),
    );

  if (fulfilled) {
    // Demanda 100% coberta — rejeita todas as outras propostas pendentes
    if (pending?.length) {
      const ids = pending.map((p) => p.id);
      await supabase
        .from("vendor_campaign_offers")
        .update({ status: "rejected" })
        .in("id", ids);
    }
  } else {
    // Demanda parcialmente coberta — atualiza goal_qty para o restante
    await supabase
      .from("campaigns")
      .update({ goal_qty: remaining })
      .eq("id", campaignId);
  }

  return { fulfilled, remaining };
}

function normalizeOffer(r) {
  const vendor = r.vendors;
  const phone = vendor?.phone || vendor?.users?.phone || null;
  return {
    id: r.id,
    campaignId: r.campaign_id,
    vendorId: r.vendor_id,
    vendorName: vendor?.name ?? "Fornecedor",
    vendorCity: vendor?.city ?? null,
    vendorPhone: phone,
    pricePerUnit: Number(r.price_per_unit),
    availableQty: Number(r.available_qty),
    notes: r.notes,
    status: r.status ?? "pending",
    createdAt: r.created_at?.slice(0, 10),
  };
}

// Busca todas as ofertas de um vendor — duas queries para evitar FK ausente no schema cache
export async function fetchVendorOffers(vendorId) {
  // 1. Busca as ofertas do vendor
  const { data: offers, error } = await supabase
    .from("vendor_campaign_offers")
    .select(
      "id, campaign_id, vendor_id, price_per_unit, available_qty, notes, status, created_at",
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error)
    throw new Error(
      "Erro ao buscar suas propostas: " +
        (error?.message || "Erro desconhecido"),
    );
  if (!offers?.length) return [];

  // 2. Busca os dados das campanhas envolvidas
  const campaignIds = [...new Set(offers.map((o) => o.campaign_id))];
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, product, unit, goal_qty, status, deadline")
    .in("id", campaignIds);
  const campMap = Object.fromEntries((campaigns ?? []).map((c) => [c.id, c]));

  return offers.map((r) => {
    const c = campMap[r.campaign_id] ?? {};
    return {
      id: r.id,
      campaignId: r.campaign_id,
      campaignName: c.product ?? "—",
      campaignUnit: c.unit ?? "un",
      campaignStatus: c.status ?? "open",
      campaignDeadline: c.deadline ?? null,
      goalQty: Number(c.goal_qty ?? 0),
      pricePerUnit: Number(r.price_per_unit),
      availableQty: Number(r.available_qty),
      notes: r.notes,
      status: r.status ?? "pending",
      createdAt: r.created_at?.slice(0, 10),
    };
  });
}

// Gestor cancela uma proposta já aceita — volta para 'pending' e remove o lote
// Restaura goal_qty para a demanda total dos pedidos aprovados
export async function cancelAcceptedOffer(offerId, campaignId, vendorId) {
  // 1. Volta a oferta para pending
  const { error: e1 } = await supabase
    .from("vendor_campaign_offers")
    .update({ status: "pending" })
    .eq("id", offerId);
  if (e1) throw new Error("Erro ao cancelar proposta: " + e1.message);

  // 2. Remove o lote que foi criado quando a oferta foi aceita
  const { error: e2 } = await supabase
    .from("campaign_lots")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("vendor_id", vendorId);
  if (e2) throw new Error("Erro ao remover lote: " + e2.message);

  // 3. Recalcula demanda restante e restaura goal_qty
  const { data: orders } = await supabase
    .from("orders")
    .select("qty")
    .eq("campaign_id", campaignId)
    .eq("status", "approved");
  const totalDemand = (orders ?? []).reduce((s, o) => s + Number(o.qty), 0);

  const { data: remainingLots } = await supabase
    .from("campaign_lots")
    .select("qty_available")
    .eq("campaign_id", campaignId);
  const stillSupplied = (remainingLots ?? []).reduce(
    (s, l) => s + Number(l.qty_available),
    0,
  );

  const newGoal = Math.max(0, totalDemand - stillSupplied);
  await supabase
    .from("campaigns")
    .update({ goal_qty: newGoal > 0 ? newGoal : totalDemand })
    .eq("id", campaignId);
}
