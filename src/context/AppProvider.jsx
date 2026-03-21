import { useState, useEffect, useCallback, useRef } from "react";
import AppContext from "./AppContext";
import { useAuth } from "../hooks/useAuth";
import { useCampaigns } from "../hooks/useCampaigns";
import { supabase } from "../lib/supabase";
import { ROLES } from "../constants/roles";

/**
 * AppProvider — Provedor centralizado de dados
 *
 * Gerencia em tempo real:
 * - Autenticação e perfil do usuário
 * - Campanhas e seus dados (offers, lots, orders)
 * - Notificações
 * - Subscrições Supabase em tempo real
 */

export function AppProvider({ children }) {
  // ─────────────────────────────────────────────────────────────────────────
  // AUTENTICAÇÃO
  // ─────────────────────────────────────────────────────────────────────────

  const {
    user,
    isAuthenticated,
    loading: authLoading,
    login,
    register,
    logout,
    profile,
    loadingProfile,
  } = useAuth();

  // ─────────────────────────────────────────────────────────────────────────
  // DADOS DE CAMPANHAS
  // ─────────────────────────────────────────────────────────────────────────

  const {
    campaigns,
    vendors,
    ownVendor,
    loading: campaignsLoading,
    error: campaignsError,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    addOrder,
    updateOrder,
    deleteOrder,
    publishToVendors,
    addPendingOrder,
    reloadCampaign,
    addVendor,
    deleteVendor,
    updateCampaignFinancials,
  } = useCampaigns(user);

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO LOCAL
  // ─────────────────────────────────────────────────────────────────────────

  const [notifications, setNotifications] = useState([]);
  const [realTimeActive, setRealTimeActive] = useState(false);

  // Referências para subscrições em tempo real
  const subscriptionsRef = useRef({});

  // ─────────────────────────────────────────────────────────────────────────
  // SUBSCRIÇÕES EM TEMPO REAL
  // ─────────────────────────────────────────────────────────────────────────

  const setupRealtimeSubscriptions = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    try {
      // Subscrever mudanças em campanhas
      const campaignsSubscription = supabase
        .channel("public:campaigns")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "campaigns" },
          (payload) => {
            console.log("📡 Campaigns realtime update:", payload);
            reloadCampaign(payload.new?.id || payload.old?.id);
          },
        )
        .subscribe();

      // Subscrever mudanças em orders
      const ordersSubscription = supabase
        .channel("public:orders")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          (payload) => {
            console.log("📡 Orders realtime update:", payload);
            if (payload.new?.campaign_id) {
              reloadCampaign(payload.new.campaign_id);
            }
          },
        )
        .subscribe();

      // Subscrever mudanças em lots
      const lotsSubscription = supabase
        .channel("public:lots")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "lots" },
          (payload) => {
            console.log("📡 Lots realtime update:", payload);
            if (payload.new?.campaign_id) {
              reloadCampaign(payload.new.campaign_id);
            }
          },
        )
        .subscribe();

      // Subscrever mudanças em offers
      const offersSubscription = supabase
        .channel("public:offers")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "offers" },
          (payload) => {
            console.log("📡 Offers realtime update:", payload);
            if (payload.new?.campaign_id) {
              reloadCampaign(payload.new.campaign_id);
            }
          },
        )
        .subscribe();

      subscriptionsRef.current = {
        campaigns: campaignsSubscription,
        orders: ordersSubscription,
        lots: lotsSubscription,
        offers: offersSubscription,
      };

      setRealTimeActive(true);
      console.log("✅ Subscrições em tempo real ativadas");
    } catch (error) {
      console.error("❌ Erro ao configurar subscrições:", error);
    }
  }, [isAuthenticated, user?.id, reloadCampaign]);

  // Limpar subscrições
  const cleanupSubscriptions = useCallback(() => {
    Object.values(subscriptionsRef.current).forEach((sub) => {
      if (sub?.unsubscribe) {
        sub.unsubscribe();
      }
    });
    subscriptionsRef.current = {};
    setRealTimeActive(false);
    console.log("🧹 Subscrições limpas");
  }, []);

  // Configurar/limpar subscrições quando autenticação muda
  useEffect(() => {
    if (isAuthenticated) {
      setupRealtimeSubscriptions();
    } else {
      cleanupSubscriptions();
    }

    return () => cleanupSubscriptions();
  }, [isAuthenticated, setupRealtimeSubscriptions, cleanupSubscriptions]);

  // ─────────────────────────────────────────────────────────────────────────
  // ADICIONAR NOTIFICAÇÃO
  // ─────────────────────────────────────────────────────────────────────────

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const newNotif = { ...notification, id };

    setNotifications((prev) => [...prev, newNotif]);

    // Auto-remover após 5 segundos
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);

    return id;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // VALOR DO CONTEXTO
  // ─────────────────────────────────────────────────────────────────────────

  const contextValue = {
    // Autenticação
    user,
    isAuthenticated,
    profile,
    authLoading,
    loadingProfile,
    login,
    register,
    logout,

    // Campanhas
    campaigns,
    vendors,
    ownVendor,
    campaignsLoading,
    campaignsError,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    reloadCampaign,
    addVendor,
    deleteVendor,
    updateCampaignFinancials,

    // Pedidos
    addOrder,
    updateOrder,
    deleteOrder,
    publishToVendors,
    addPendingOrder,

    // Notificações
    notifications,
    addNotification,

    // Estado em tempo real
    realTimeActive,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
