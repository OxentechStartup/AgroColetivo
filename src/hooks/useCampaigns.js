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
  fetchAllOrdersForCampaigns,
  fetchAllLotsForCampaigns,
} from "../lib/lots";
import { fetchVendors, createVendor, deleteVendor } from "../lib/vendors";
import { findOrCreateProducer } from "../lib/producers";
import { ROLES } from "../constants/roles";
import { supabase } from "../lib/supabase";

export function useCampaigns(user) {
  const [campaigns, setCampaigns] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [ownVendor, setOwnVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reloadCampaign = useCallback(
    async (campaignId) => {
      const isVendor = user?.role === ROLES.VENDOR;
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
          const totalSupplied = lots.reduce(
            (s, l) => s + (l.qtyAvailable ?? 0),
            0,
          );
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
            orders: isVendor ? [] : approved,
            pendingOrders: isVendor ? [] : pending,
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

      // Resolve vendorId se vendor ainda não tem
      if (user.role === ROLES.VENDOR && !user.vendorId) {
        let { data: vRow } = await supabase
          .from("vendors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!vRow && user.phone) {
          const { data: vByPhone } = await supabase
            .from("vendors")
            .select("id")
            .eq("phone", user.phone.replace(/\D/g, ""))
            .maybeSingle();
          if (vByPhone) {
            await supabase
              .from("vendors")
              .update({ user_id: user.id })
              .eq("id", vByPhone.id);
            vRow = vByPhone;
          }
        }
        if (vRow) userWithVendorId = { ...user, vendorId: vRow.id };
      }

      const isVendor = user.role === ROLES.VENDOR;
      const vendorId = userWithVendorId?.vendorId ?? null;

      // Busca campanhas e vendors em paralelo
      const [rawCampaigns, rawVendors] = await Promise.all([
        fetchCampaigns(userWithVendorId),
        fetchVendors(user.id, user.role),
      ]);

      // Busca vendor próprio se necessário
      if (isVendor && vendorId) {
        supabase
          .from("vendors")
          .select("*")
          .eq("id", vendorId)
          .maybeSingle()
          .then(({ data: vFull }) => {
            if (vFull) setOwnVendor({ ...vFull, admin_user_id: vFull.user_id });
          });
      }

      if (rawCampaigns.length === 0) {
        setCampaigns([]);
        setVendors(rawVendors);
        return;
      }

      // ── OTIMIZAÇÃO: busca orders e lots de TODAS as campanhas de uma vez ──
      // Antes: 1 query por campanha × N campanhas = N+1 queries
      // Agora: 2 queries totais independente de quantas campanhas existem
      const campaignIds = rawCampaigns.map((c) => c.id);
      const [allOrders, allLots] = await Promise.all([
        isVendor
          ? Promise.resolve([])
          : fetchAllOrdersForCampaigns(campaignIds),
        fetchAllLotsForCampaigns(campaignIds),
      ]);

      // Agrupa por campaign_id em memória
      const ordersByCampaign = groupBy(allOrders, "campaign_id");
      const lotsByCampaign = groupBy(allLots, "campaign_id");

      const withOrders = rawCampaigns.map((c) => {
        const orders = ordersByCampaign[c.id] ?? [];
        const lots = (lotsByCampaign[c.id] ?? []).map(normalizeLotRaw);

        const visibleLots =
          isVendor && vendorId
            ? lots.filter((l) => l.vendorId === vendorId)
            : lots;
        const totalSupplied = lots.reduce(
          (s, l) => s + (l.qtyAvailable ?? 0),
          0,
        );
        const approved = orders
          .filter((o) => o.status === "approved")
          .map(normalizeOrder);
        const pending = orders
          .filter((o) => o.status === "pending")
          .map(normalizeOrder);

        return {
          ...c,
          orders: isVendor ? [] : approved,
          pendingOrders: isVendor ? [] : pending,
          lots: visibleLots,
          totalSupplied,
          approvedCount: approved.length,
          totalOrdered: approved.reduce((s, o) => s + o.qty, 0),
          pendingCount: pending.length,
        };
      });

      setCampaigns(withOrders);
      setVendors(rawVendors);
    } catch (err) {
      setError(err?.message || "Erro ao carregar cotações");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addCampaign = async (c) => {
    const created = await createCampaign(c, user?.id);
    logEvent(
      created.id,
      EVENT.CAMPAIGN_CREATED,
      { product: c.product },
      user?.id,
    );
    await loadAll();
  };
  const saveFinancials = async (id, v) => {
    await updateCampaignFinancials(id, v);
    if (v.freight != null)
      logEvent(
        id,
        EVENT.FREIGHT_SET,
        { freight: v.freight, markup: v.markup },
        user?.id,
      );
    if (v.price != null)
      logEvent(id, EVENT.PRICE_SET, { price: v.price }, user?.id);
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
    logEvent(
      campaignId,
      EVENT.LOT_ADDED,
      { vendorName: lot.vendorName, qty: lot.qty },
      user?.id,
    );
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
    logEvent(
      campaignId,
      EVENT.ORDER_SUBMITTED,
      { producerName: order.producerName, qty: order.qty },
      buyer.id,
    );
    await reloadCampaign(campaignId);
  };
  const removeOrder = async (campaignId, orderId) => {
    await deleteOrder(orderId);
    await reloadCampaign(campaignId);
  };
  const addPendingOrder = async (campaignId, order) => {
    if (!campaignId) throw new Error("Cotação inválida.");
    const buyer = await findOrCreateProducer(order.producerName, order.phone);
    await createOrder(campaignId, buyer.id, order.qty, "pending");
    logEvent(
      campaignId,
      EVENT.ORDER_SUBMITTED,
      { producerName: order.producerName, qty: order.qty, pending: true },
      null,
    );
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

// Agrupa array de objetos por campo
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function normalizeLotRaw(r) {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    vendorId: r.vendor_id,
    vendorName: r.vendors?.name || r.vendor_name || "Fornecedor avulso",
    qtyAvailable: Number(r.qty_available),
    pricePerUnit: Number(r.price_per_unit),
    priority: Number(r.priority ?? 0),
    notes: r.notes,
    createdAt: r.created_at?.slice(0, 10),
  };
}

function normalizeOrder(o) {
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
