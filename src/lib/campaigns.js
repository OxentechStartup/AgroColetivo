import { supabase } from "./supabase.js";
import { ROLES } from "../constants/roles.js";

// Filtra cotações de acordo com o papel do usuário:
//  - admin  → todas as cotações
//  - gestor → apenas as cotações que ele criou (pivo_id = user.id)
//  - vendor → apenas cotações abertas/negociando (para poder cotar)
//             + cotações onde já tem um lote cadastrado
export async function fetchCampaigns(user) {
  const role = user?.role ?? ROLES.GESTOR;

  if (role === ROLES.VENDOR) {
    // Busca os IDs de campanhas onde este vendor tem lote
    const vendorId = user?.vendorId ?? null;
    let involvedIds = [];
    if (vendorId) {
      const { data: lots } = await supabase
        .from("campaign_lots")
        .select("campaign_id")
        .eq("vendor_id", vendorId);
      involvedIds = (lots ?? []).map((l) => l.campaign_id);
    }

    // Busca campanhas abertas/negociando PUBLICADAS PARA VENDORS
    const { data: publishedCampaigns, error: err1 } = await supabase
      .from("v_campaign_summary")
      .select("*")
      .in("status", ["open", "negotiating"])
      .eq("published_to_vendors", true)
      .order("created_at", { ascending: false });

    if (err1) {
      throw new Error(
        "Erro ao buscar cotações publicadas: " +
          (err1?.message || "unknown error"),
      );
    }

    const data = publishedCampaigns ?? [];

    // Se vendor tem lotes, adiciona campanhas onde já está envolvido
    if (involvedIds.length > 0) {
      const { data: campaignsWithLots, error: err2 } = await supabase
        .from("v_campaign_summary")
        .select("*")
        .in("id", involvedIds)
        .neq("status", "finished")
        .order("created_at", { ascending: false });

      if (err2) {
        throw new Error(
          "Erro ao buscar campanhas com lotes: " +
            (err2?.message || "unknown error"),
        );
      }

      // Merge resultados removendo duplicatas
      const merged = [...data, ...(campaignsWithLots ?? [])];
      const unique = Array.from(new Map(merged.map((c) => [c.id, c])).values());
      return unique.map(normalizeCampaign);
    }

    return data.map(normalizeCampaign);
  }

  if (role === ROLES.GESTOR) {
    // Valida se user.id existe
    if (!user?.id) {
      return [];
    }
    const { data, error } = await supabase
      .from("v_campaign_summary")
      .select("*")
      .eq("pivo_id", user.id)
      .order("created_at", { ascending: false });
    if (error)
      throw new Error(
        "Erro ao buscar cotações: " + (error?.message || "unknown error"),
      );
    return data.map(normalizeCampaign);
  }

  // admin — todas
  const { data, error } = await supabase
    .from("v_campaign_summary")
    .select("*")
    .order("created_at", { ascending: false });
  if (error)
    throw new Error(
      "Erro ao buscar cotações: " + (error?.message || "unknown error"),
    );
  return data.map(normalizeCampaign);
}

export async function createCampaign(c, gestorId) {
  const slug =
    "c-" +
    c.product
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 24) +
    "-" +
    Date.now().toString(36);

  // Valida se o gestorId existe no banco (evita 409 por FK inválida após recriar banco)
  let validGestorId = null;
  if (gestorId) {
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("id", gestorId)
      .maybeSingle();
    validGestorId = userRow ? gestorId : null;
  }

  const payload = {
    slug,
    product: c.product,
    unit: c.unit,
    unit_weight_kg: Number(c.unitWeight),
    goal_qty: Number(c.goalQty),
    min_qty: Number(c.minQty),
    deadline: c.deadline || null,
    status: "open",
    pivo_id: validGestorId,
    image_url: c.imageUrl || null,
  };

  const { data, error } = await supabase
    .from("campaigns")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(
      "Erro ao criar cotação: " +
        (error?.message || "unknown error") +
        " (código " +
        (error?.code || "unknown") +
        ")",
    );
  }
  return data;
}

export async function updateCampaignFinancials(
  campaignId,
  { price, freight, markup },
) {
  const patch = {};
  if (price != null) {
    patch.price_per_unit = price;
    patch.status = "negotiating";
  }
  if (freight != null) patch.freight_total = freight;
  if (markup != null) patch.markup_total = markup;
  const { data, error } = await supabase
    .from("campaigns")
    .update(patch)
    .eq("id", campaignId)
    .select()
    .single();
  if (error) throw new Error(error?.message || "Erro ao atualizar cotação");
  return data;
}

export async function setCampaignStatus(campaignId, status) {
  const patch = { status };
  // Set closed_at when finishing, clear it on reopen/publish
  if (status === "finished") patch.closed_at = new Date().toISOString();
  if (status === "open" || status === "negotiating") patch.closed_at = null;

  const { data, error } = await supabase
    .from("campaigns")
    .update(patch)
    .eq("id", campaignId)
    .select()
    .single();
  if (error) throw new Error(error?.message || "Erro ao atualizar status");
  return data;
}

export async function setPublishStatus(
  campaignId,
  status,
  publishedToBuyers,
  publishedToVendors,
) {
  const patch = {
    status,
    published_to_buyers: publishedToBuyers,
    published_to_vendors: publishedToVendors,
  };
  // Set closed_at when finishing, clear it on reopen/publish
  if (status === "finished") patch.closed_at = new Date().toISOString();
  if (status === "open" || status === "negotiating") patch.closed_at = null;

  const { data, error } = await supabase
    .from("campaigns")
    .update(patch)
    .eq("id", campaignId)
    .select()
    .single();

  if (error) {
    throw new Error(error?.message || "Erro ao atualizar publicação");
  }

  return data;
}

export async function createOrder(
  campaignId,
  buyerId,
  qty,
  status = "pending",
) {
  const { data, error } = await supabase
    .from("orders")
    .insert({ campaign_id: campaignId, buyer_id: buyerId, qty, status })
    .select()
    .single();
  if (error)
    throw new Error(
      "Erro ao criar pedido: " + (error?.message || "unknown error"),
    );
  return data;
}

export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw new Error(error?.message || "Erro ao atualizar pedido");
  return data;
}

export async function deleteOrder(orderId) {
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw new Error(error?.message || "Erro ao deletar pedido");
}

export async function markFeePaid(campaignId, adminName) {
  const { error } = await supabase
    .from("campaigns")
    .update({
      fee_paid_at: new Date().toISOString(),
      fee_paid_by: adminName ?? "Admin",
    })
    .eq("id", campaignId);
  if (error) throw new Error(error?.message || "Erro ao registrar pagamento");
}

export async function deleteCampaign(campaignId) {
  await supabase.from("orders").delete().eq("campaign_id", campaignId);
  await supabase.from("campaign_lots").delete().eq("campaign_id", campaignId);
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId);
  if (error) throw new Error(error?.message || "Erro ao deletar cotação");
}

function normalizeCampaign(row) {
  return {
    id: row.id,
    slug: row.slug,
    product: row.product,
    unit: row.unit,
    unitWeight: Number(row.unit_weight_kg),
    goalQty: Number(row.goal_qty),
    minQty: Number(row.min_qty),
    maxQty: row.max_qty ? Number(row.max_qty) : null,
    pricePerUnit:
      row.price_per_unit != null ? Number(row.price_per_unit) : null,
    freightTotal: row.freight_total != null ? Number(row.freight_total) : null,
    markupTotal: row.markup_total != null ? Number(row.markup_total) : null,
    status: row.status,
    closedAt: row.closed_at ?? null,
    feePaidAt: row.fee_paid_at ?? null,
    feePaidBy: row.fee_paid_by ?? null,
    deadline: row.deadline,
    createdAt: row.created_at?.slice(0, 10),
    pivoId: row.pivo_id ?? null,
    publishedToVendors: row.published_to_vendors ?? false,
    publishedToBuyers: row.published_to_buyers ?? false,
    approvedCount: Number(row.approved_count ?? 0),
    totalOrdered: Number(row.total_ordered ?? 0),
    pendingCount: Number(row.pending_count ?? 0),
    progressPct: Number(row.progress_pct ?? 0),
    freightPerProducer:
      row.freight_per_producer != null
        ? Number(row.freight_per_producer)
        : null,
    markupPerProducer:
      row.markup_per_producer != null ? Number(row.markup_per_producer) : null,
    orders: [],
    pendingOrders: [],
  };
}
