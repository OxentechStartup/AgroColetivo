import { useState, useEffect, useCallback } from "react";
import {
  fetchCampaigns,
  setCampaignStatus,
  createCampaign,
  updateCampaignFinancials,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  deleteCampaign as apiDeleteCampaign,
} from "../lib/campaigns";
import { logEvent, EVENT } from "../lib/events";
import {
  fetchOrdersWithLots,
  fetchLots,
  createLot,
  deleteLot,
} from "../lib/lots";
import { fetchVendors, createVendor, deleteVendor } from "../lib/vendors";
import { findOrCreateProducer } from "../lib/producers";
import { ROLES } from "../constants/roles";
import { supabase } from "../lib/supabase";

export function useCampaigns(user) {
  const [campaigns, setCampaigns] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [ownVendor, setOwnVendor] = useState(null); // vendor's own record
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reloadCampaign = useCallback(
    async (campaignId) => {
      const isVendor = user?.role === ROLES.VENDOR;
      // Busca campos da campanha + orders + lots em paralelo
      const [campRow, allOrders, lots] = await Promise.all([
        supabase.from("campaigns").select("*").eq("id", campaignId).single(),
        fetchOrdersWithLots(campaignId),
        fetchLots(campaignId),
      ]);

      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== campaignId) return c;
          const approved = allOrders
            .filter((o) => o.status === "approved")
            .map(normalizeOrder);
          const pending = allOrders
            .filter((o) => o.status === "pending")
            .map(normalizeOrder);

          const vendorId = user?.vendorId ?? null;
          const visibleLots =
            isVendor && vendorId
              ? lots.filter((l) => l.vendorId === vendorId)
              : lots;
          const visibleOrders = isVendor ? [] : approved;
          const visiblePending = isVendor ? [] : pending;
          const totalSupplied = lots.reduce(
            (s, l) => s + (l.qtyAvailable ?? 0),
            0,
          );

          // Campos financeiros frescos do banco
          const row = campRow.data ?? {};
          return {
            ...c,
            freightTotal:
              row.freight_total != null ? Number(row.freight_total) : null,
            markupTotal:
              row.markup_total != null ? Number(row.markup_total) : null,
            pricePerUnit:
              row.price_per_unit != null ? Number(row.price_per_unit) : null,
            goalQty: row.goal_qty != null ? Number(row.goal_qty) : c.goalQty,
            status: row.status ?? c.status,
            feePaidAt: row.fee_paid_at ?? c.feePaidAt ?? null,
            feePaidBy: row.fee_paid_by ?? c.feePaidBy ?? null,
            orders: visibleOrders,
            pendingOrders: visiblePending,
            lots: visibleLots,
            totalSupplied,
            approvedCount: approved.length,
            totalOrdered: approved.reduce((s, o) => s + o.qty, 0),
            pendingCount: pending.length,
          };
        }),
      );
    },
    [user],
  );

  const loadAll = useCallback(async () => {
    // Sem usuário logado, limpa tudo e não busca nada
    if (!user) {
      setCampaigns([]);
      setVendors([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let userWithVendorId = user;
      if (user.role === ROLES.VENDOR && !user.vendorId) {
        // 1. Try by user_id
        let { data: vRow } = await supabase
          .from("vendors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        // 2. Fallback: try by phone (vendor registered by gestor, not yet linked)
        if (!vRow && user.phone) {
          const { data: vByPhone } = await supabase
            .from("vendors")
            .select("id")
            .eq("phone", user.phone.replace(/\D/g, ""))
            .maybeSingle();
          if (vByPhone) {
            // Link vendor record to this user
            await supabase
              .from("vendors")
              .update({ user_id: user.id })
              .eq("id", vByPhone.id);
            vRow = vByPhone;
          }
        }

        if (vRow) userWithVendorId = { ...user, vendorId: vRow.id };
      }

      const [rawCampaigns, rawVendors] = await Promise.all([
        fetchCampaigns(userWithVendorId),
        fetchVendors(user.id, user.role),
      ]);
      const isVendor = user.role === ROLES.VENDOR;
      const vendorId = userWithVendorId?.vendorId ?? null;

      // For vendors: fetch their own vendor record so App can use it
      if (isVendor && vendorId) {
        const { data: vFull } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", vendorId)
          .maybeSingle();
        if (vFull) setOwnVendor({ ...vFull, admin_user_id: vFull.user_id });
      }

      const withOrders = await Promise.all(
        rawCampaigns.map(async (c) => {
          const [all, lots] = await Promise.all([
            fetchOrdersWithLots(c.id),
            fetchLots(c.id),
          ]);

          const visibleLots =
            isVendor && vendorId
              ? lots.filter((l) => l.vendorId === vendorId)
              : lots;

          // totalSupplied = soma de TODOS os lotes (antes do filtro por vendor)
          // usado para calcular demanda restante na tela do fornecedor
          const totalSupplied = lots.reduce(
            (s, l) => s + (l.qtyAvailable ?? 0),
            0,
          );

          const approved = all
            .filter((o) => o.status === "approved")
            .map(normalizeOrder);
          const pending = all
            .filter((o) => o.status === "pending")
            .map(normalizeOrder);

          return {
            ...c,
            orders: isVendor ? [] : approved,
            pendingOrders: isVendor ? [] : pending,
            lots: visibleLots,
            totalSupplied,
          };
        }),
      );
      setCampaigns(withOrders);
      setVendors(rawVendors);
    } catch (err) {
      setError(err.message || "Erro ao carregar cotações");
    } finally {
      setLoading(false);
    }
  }, [user]); // ← user como dependência: recarrega sempre que o usuário mudar

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addCampaign = async (c) => {
    const created = await createCampaign(c, user?.id);
    logEvent(created.id, EVENT.CAMPAIGN_CREATED, { product: c.product }, user?.id);
    await loadAll();
  };
  const saveFinancials = async (id, v) => {
    await updateCampaignFinancials(id, v);
    if (v.freight != null) logEvent(id, EVENT.FREIGHT_SET, { freight: v.freight, markup: v.markup }, user?.id);
    if (v.price != null)   logEvent(id, EVENT.PRICE_SET,   { price: v.price }, user?.id);
    await reloadCampaign(id);
  };
  const closeCampaign = async (id) => {
    await setCampaignStatus(id, "closed");
    logEvent(id, EVENT.CAMPAIGN_CLOSED, null, user?.id);
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "closed" } : c)),
    );
  };
  const finishCampaign = async (id) => {
    await setCampaignStatus(id, "finished");
    logEvent(id, EVENT.CAMPAIGN_CLOSED, { finished: true }, user?.id);
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "finished" } : c)),
    );
  };
  const reopenCampaign = async (id) => {
    await setCampaignStatus(id, "open");
    logEvent(id, EVENT.CAMPAIGN_REOPENED, null, user?.id);
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "open" } : c)),
    );
  };
  const publishToVendors = async (id) => {
    await setCampaignStatus(id, "negotiating");
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "negotiating" } : c)),
    );
  };
  const deleteCampaign = async (id) => {
    await apiDeleteCampaign(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  };

  const addLot = async (campaignId, lot) => {
    await createLot(campaignId, lot);
    logEvent(campaignId, EVENT.LOT_ADDED, { vendorName: lot.vendorName, qty: lot.qty }, user?.id);
    await reloadCampaign(campaignId);
  };
  const removeLot = async (campaignId, lotId) => {
    await deleteLot(lotId);
    logEvent(campaignId, EVENT.LOT_REMOVED, { lotId }, user?.id);
    await reloadCampaign(campaignId);
  };
  const addOrder = async (campaignId, order) => {
    const buyer = await findOrCreateProducer(order.producerName, order.phone);
    await createOrder(campaignId, buyer.id, order.qty, "approved");
    logEvent(campaignId, EVENT.ORDER_SUBMITTED, { producerName: order.producerName, qty: order.qty }, buyer.id);
    await reloadCampaign(campaignId);
  };
  const removeOrder = async (campaignId, orderId) => {
    await deleteOrder(orderId);
    await reloadCampaign(campaignId);
  };

  const addPendingOrder = async (campaignId, order) => {
    const buyer = await findOrCreateProducer(order.producerName, order.phone);
    await createOrder(campaignId, buyer.id, order.qty, "pending");
    logEvent(campaignId, EVENT.ORDER_SUBMITTED, { producerName: order.producerName, qty: order.qty, pending: true }, buyer.id);
    await reloadCampaign(campaignId);
  };
  const approvePending = async (campaignId, orderId) => {
    await updateOrderStatus(orderId, "approved");
    logEvent(campaignId, EVENT.ORDER_APPROVED, { orderId }, user?.id);
    await reloadCampaign(campaignId);
  };
  const rejectPending = async (campaignId, orderId) => {
    await updateOrderStatus(orderId, "rejected");
    logEvent(campaignId, EVENT.ORDER_REJECTED, { orderId }, user?.id);
    await reloadCampaign(campaignId);
  };

  const addVendor = async (v) => {
    const nv = await createVendor({ ...v, user_id: user?.id });
    setVendors((prev) => [...prev, nv]);
  };
  const removeVendor = async (id) => {
    await deleteVendor(id, user?.id, user?.role);
    setVendors((prev) => prev.filter((v) => v.id !== id));
  };

  return {
    campaigns,
    vendors,
    ownVendor,
    loading,
    error,
    reload: loadAll,
    reloadCampaign,
    addCampaign,
    saveFinancials,
    closeCampaign,
    finishCampaign,
    reopenCampaign,
    publishToVendors,
    addLot,
    removeLot,
    deleteCampaign,
    addOrder,
    removeOrder,
    addPendingOrder,
    approvePending,
    rejectPending,
    addVendor,
    removeVendor,
  };
}

function normalizeOrder(o) {
  // suporta tanto buyers (novo schema) quanto producers (legado)
  const person = o.buyers ?? o.producers;
  const lot = o.campaign_lots;
  return {
    orderId: o.id,
    producerName: person?.name ?? "—",
    phone: person?.phone ?? "",
    qty: o.qty,
    confirmedAt: o.submitted_at?.slice(0, 10),
    lotId: o.lot_id ?? null,
    lotVendor: lot?.vendors?.name || lot?.vendor_name || null,
    lotPrice: lot?.price_per_unit ?? null,
  };
}
