import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchCampaigns,
  setCampaignStatus,
  setPublishStatus,
  createCampaign,
  updateCampaignFinancials,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  deleteCampaign as apiDeleteCampaign,
} from "../lib/campaigns.js";
import { logEvent, EVENT } from "../lib/events.js";
import {
  fetchOrdersWithLots,
  fetchLots,
  createLot,
  deleteLot,
  fetchAllOrdersForCampaigns,
  fetchAllLotsForCampaigns,
} from "../lib/lots.js";
import { fetchVendors, createVendor, deleteVendor } from "../lib/vendors.js";
import { findOrCreateProducer } from "../lib/producers.js";
import {
  notifyManagerNewOrder,
  notifyVendorNewProposal,
  notifyManagerProposalReceived,
} from "../lib/notifications.js";
import { ROLES } from "../constants/roles.js";
import { supabase } from "../lib/supabase.js";
import {
  isRealtimeAvailable,
  markRealtimeFailure,
  clearRealtimeBackoff,
  cleanupRealtimeChannel,
} from "../lib/realtimeGuard.js";

const REALTIME_RELOAD_DEBOUNCE_MS = 700;
const BACKGROUND_SYNC_INTERVAL_MS = 45000;
const CAMPAIGNS_LOAD_WATCHDOG_MS = 15000;

export function useCampaigns(user) {
  const [campaigns, setCampaigns] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [ownVendor, setOwnVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const syncTimerRef = useRef(null);
  const syncInFlightRef = useRef(false);

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

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!user) {
        console.log("📊 useCampaigns: sem user, limpando");
        setCampaigns([]);
        setVendors([]);
        setOwnVendor(null);
        setLoading(false);
        setError(null);
        return;
      }

      console.log("📊 useCampaigns: iniciando loadAll para user", user.email);
      if (!silent) setLoading(true);
      setError(null);
      let watchdogId = null;

      if (!silent) {
        watchdogId = setTimeout(() => {
          setLoading(false);
          setError(
            "Carregamento demorou mais que o esperado. Verifique sua conexao e tente novamente.",
          );
        }, CAMPAIGNS_LOAD_WATCHDOG_MS);
      }

      try {
        let userWithVendorId = user;

        // Step 1: Resolve vendorId se vendor ainda não tem
        if (user.role === ROLES.VENDOR && !user.vendorId) {
          console.log("📊 Step 1: Buscando vendorId");
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
          if (vRow) {
            userWithVendorId = { ...user, vendorId: vRow.id };
            console.log("📊 Step 1 OK: vendorId =", vRow.id);
          }
        }

        const isVendor = user.role === ROLES.VENDOR;
        const vendorId = userWithVendorId?.vendorId ?? null;

        // Step 2: Busca campanhas, vendors e vendor próprio em paralelo
        console.log("📊 Step 2: Buscando campanhas, vendors, ownVendor");
        const [rawCampaigns, rawVendors, ownVendorData] = await Promise.all([
          fetchCampaigns(userWithVendorId),
          fetchVendors(user.id, user.role),
          isVendor && vendorId
            ? supabase
                .from("vendors")
                .select("*")
                .eq("id", vendorId)
                .maybeSingle()
                .then(({ data }) => data)
            : Promise.resolve(null),
        ]);

        console.log(
          "📊 Step 2 OK: campanhas =",
          rawCampaigns.length,
          "vendors =",
          rawVendors.length,
        );

        // Atualiza vendor próprio se encontrou
        if (ownVendorData) {
          console.log("📊 Step 2: Atualizando ownVendor");
          setOwnVendor({
            ...ownVendorData,
            admin_user_id: ownVendorData.user_id,
          });
        }

        if (rawCampaigns.length === 0) {
          console.log("📊 Nenhuma campanha, finalizando");
          setCampaigns([]);
          setVendors(rawVendors);
          setError(null);
          if (!silent) setLoading(false);
          return;
        }

        // Step 3: Busca orders e lots
        console.log("📊 Step 3: Buscando orders e lots");
        const campaignIds = rawCampaigns.map((c) => c.id);
        const [allOrders, allLots] = await Promise.all([
          isVendor
            ? Promise.resolve([])
            : fetchAllOrdersForCampaigns(campaignIds),
          fetchAllLotsForCampaigns(campaignIds),
        ]);

        console.log(
          "📊 Step 3 OK: orders =",
          allOrders.length,
          "lots =",
          allLots.length,
        );

        // Step 4: Agrupa e normaliza
        console.log("📊 Step 4: Agrupando e normalizando");
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

        console.log("📊 Step 4 OK: campanhas normalizadas");
        setCampaigns(withOrders);
        setVendors(rawVendors);
        setError(null);
        console.log("✅ useCampaigns: loadAll concluído com sucesso");
      } catch (err) {
        console.error("❌ useCampaigns erro:", err?.message);
        setError(err?.message || "Erro ao carregar cotações");
      } finally {
        if (watchdogId) clearTimeout(watchdogId);
        if (!silent) setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const syncNow = useCallback(async () => {
    if (!user?.id || syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    try {
      await loadAll({ silent: true });
    } finally {
      syncInFlightRef.current = false;
    }
  }, [loadAll, user?.id]);

  const scheduleSync = useCallback(
    (delay = REALTIME_RELOAD_DEBOUNCE_MS) => {
      if (!user?.id) return;

      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }

      syncTimerRef.current = setTimeout(() => {
        syncNow().catch(() => {});
      }, delay);
    },
    [syncNow, user?.id],
  );

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !isRealtimeAvailable()) return;

    const onDbChange = () => scheduleSync();
    const channel = supabase
      .channel(`app_data_sync_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        onDbChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        onDbChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_lots" },
        onDbChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendors" },
        onDbChange,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearRealtimeBackoff();
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          markRealtimeFailure("useCampaigns", status);
          cleanupRealtimeChannel(supabase, channel);
        }
      });

    return () => {
      cleanupRealtimeChannel(supabase, channel);
    };
  }, [scheduleSync, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const refreshOnResume = () => scheduleSync(0);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleSync(0);
      }
    };

    window.addEventListener("focus", refreshOnResume);
    window.addEventListener("online", refreshOnResume);
    window.addEventListener("pageshow", refreshOnResume);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshOnResume);
      window.removeEventListener("online", refreshOnResume);
      window.removeEventListener("pageshow", refreshOnResume);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [scheduleSync, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const intervalId = setInterval(() => {
      scheduleSync(0);
    }, BACKGROUND_SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [scheduleSync, user?.id]);

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
    // Publicar para ambos: compradores E fornecedores
    await setPublishStatus(id, "negotiating", true, true);
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "negotiating",
              publishedToBuyers: true,
              publishedToVendors: true,
            }
          : c,
      ),
    );
  };
  const publishToBuyers = async (id) => {
    // Abre apenas para compradores
    await setPublishStatus(id, "open", true, false);
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "open",
              publishedToBuyers: true,
              publishedToVendors: false,
            }
          : c,
      ),
    );
  };
  const closeToBuyers = async (id) => {
    // Fecha para compradores, mas pode abrir para fornecedores
    await setPublishStatus(id, "closed", false, false);
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "closed",
              publishedToBuyers: false,
              publishedToVendors: false,
            }
          : c,
      ),
    );
  };
  const publishToVendorsOnly = async (id) => {
    // Abre apenas para fornecedores (quando já fechou para compradores)
    await setPublishStatus(id, "negotiating", false, true);
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "negotiating",
              publishedToBuyers: false,
              publishedToVendors: true,
            }
          : c,
      ),
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

    // Buscar dados da campanha para enviar no email
    const campaign = campaigns.find((c) => c.id === campaignId);

    // Enviar email de notificação para o gestor informando que recebeu uma proposta
    if (user?.email && campaign) {
      const campaignLink = `${window.location.origin}/#campaigns`;

      await notifyManagerProposalReceived(user.email, user.name || "Gestor", {
        vendorName: lot.vendorName,
        productName: campaign.product,
        quantity: lot.qty,
        unit: campaign.unit || "unidades",
        pricePerUnit: lot.price,
        deliveryDate: lot.deliveryDate || "A confirmar",
        campaignLink,
      }).catch((err) =>
        console.warn(
          "⚠️ Não foi possível enviar email de proposta recebida:",
          err,
        ),
      );
    }

    await reloadCampaign(campaignId);
  };
  const removeLot = async (campaignId, lotId) => {
    await deleteLot(lotId);
    logEvent(campaignId, EVENT.LOT_REMOVED, { lotId }, user?.id);
    await reloadCampaign(campaignId);
  };
  const addOrder = async (campaignId, order) => {
    // Buscar dados da campanha para enviar no email
    const campaign = campaigns.find((c) => c.id === campaignId);

    const buyer = await findOrCreateProducer(order.producerName, order.phone);

    await createOrder(campaignId, buyer.id, order.qty, "approved");

    logEvent(
      campaignId,
      EVENT.ORDER_SUBMITTED,
      { producerName: order.producerName, qty: order.qty },
      buyer.id,
    );

    // Enviar email de notificação para o gestor
    if (user?.email && campaign) {
      const campaignLink = `${window.location.origin}/#campaigns`;
      const fmtDate = new Date().toLocaleDateString("pt-BR");

      await notifyManagerNewOrder(user.email, user.name || "Gestor", {
        productName: campaign.product,
        quantity: order.qty,
        unit: campaign.unit || "unidades",
        producerName: order.producerName,
        producerPhone: order.phone,
        date: fmtDate,
        campaignLink,
      }).catch((err) =>
        console.warn("⚠️ Não foi possível enviar email de novo pedido:", err),
      );
    }

    // ✅ NÃO chama reloadCampaign aqui, deixa CampaignsPage chamar reload() depois
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
    publishToBuyers,
    closeToBuyers,
    publishToVendorsOnly,
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
