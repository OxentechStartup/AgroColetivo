import { useState, useEffect } from "react";
import { useMultipleRealtimeSubscriptions } from "./useRealtimeSubscription";
import { supabase } from "../lib/supabase";

/**
 * useOffersRealtime — Carrega e atualiza ofertas em tempo real
 *
 * Uso em BuyerOrderStatusPage:
 * const { offers, loadingOffers } = useOffersRealtime(campaignId);
 */

export function useOffersRealtime(campaignId) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOffers = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendor_campaign_offers")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("price_per_unit", { ascending: true });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("❌ Erro ao carregar ofertas:", error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useMultipleRealtimeSubscriptions(
    [
      {
        table: "vendor_campaign_offers",
        filterColumn: "campaign_id",
        filterValue: campaignId,
      },
    ],
    loadOffers,
  );

  useEffect(() => {
    loadOffers();
  }, [campaignId]);

  return { offers, loadingOffers: loading };
}

/**
 * useOrdersRealtime — Carrega e atualiza pedidos em tempo real
 */

export function useOrdersRealtime(campaignId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("❌ Erro ao carregar pedidos:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useMultipleRealtimeSubscriptions(
    [{ table: "orders", filterColumn: "campaign_id", filterValue: campaignId }],
    loadOrders,
  );

  useEffect(() => {
    loadOrders();
  }, [campaignId]);

  return { orders, loadingOrders: loading };
}

/**
 * useLotsRealtime — Carrega e atualiza lotes em tempo real
 */

export function useLotsRealtime(campaignId) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLots = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaign_lots")
        .select("*")
        .eq("campaign_id", campaignId);

      if (error) throw error;
      setLots(data || []);
    } catch (error) {
      console.error("❌ Erro ao carregar lotes:", error);
      setLots([]);
    } finally {
      setLoading(false);
    }
  };

  useMultipleRealtimeSubscriptions(
    [
      {
        table: "campaign_lots",
        filterColumn: "campaign_id",
        filterValue: campaignId,
      },
    ],
    loadLots,
  );

  useEffect(() => {
    loadLots();
  }, [campaignId]);

  return { lots, loadingLots: loading };
}

/**
 * useVendorsRealtime — Carrega e atualiza fornecedores em tempo real
 */

export function useVendorsRealtime() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error("❌ Erro ao carregar fornecedores:", error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useMultipleRealtimeSubscriptions([{ table: "vendors" }], loadVendors);

  useEffect(() => {
    loadVendors();
  }, []);

  return { vendors, loadingVendors: loading };
}

/**
 * useGestoresRealtime — Carrega e atualiza gestores em tempo real
 */

export function useGestoresRealtime() {
  const [gestores, setGestores] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadGestores = async () => {
    setLoading(true);
    try {
      // Busca usuários que são gestores (role = 'gestor' ou 'admin')
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("role", ["gestor", "admin"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGestores(data || []);
    } catch (error) {
      console.error("❌ Erro ao carregar gestores:", error);
      setGestores([]);
    } finally {
      setLoading(false);
    }
  };

  useMultipleRealtimeSubscriptions([{ table: "users" }], loadGestores);

  useEffect(() => {
    loadGestores();
  }, []);

  return { gestores, loadingGestores: loading };
}

/**
 * useUserProfileRealtime — Carrega e atualiza perfil do usuário em tempo real
 */

export function useUserProfileRealtime(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data || null);
    } catch (error) {
      console.error("❌ Erro ao carregar perfil:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useMultipleRealtimeSubscriptions(
    [{ table: "users", filterColumn: "id", filterValue: userId }],
    loadProfile,
  );

  useEffect(() => {
    loadProfile();
  }, [userId]);

  return { profile, loadingProfile: loading };
}

/**
 * useVendorProfileRealtime — Carrega e atualiza perfil do fornecedor em tempo real
 */

export function useVendorProfileRealtime(vendorId) {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadVendor = async () => {
    if (!vendorId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", vendorId)
        .single();

      if (error) throw error;
      setVendor(data || null);
    } catch (error) {
      console.error("❌ Erro ao carregar perfil de fornecedor:", error);
      setVendor(null);
    } finally {
      setLoading(false);
    }
  };

  useMultipleRealtimeSubscriptions(
    [{ table: "vendors", filterColumn: "id", filterValue: vendorId }],
    loadVendor,
  );

  useEffect(() => {
    loadVendor();
  }, [vendorId]);

  return { vendor, loadingVendor: loading };
}

export default {
  useOffersRealtime,
  useOrdersRealtime,
  useLotsRealtime,
  useVendorsRealtime,
  useGestoresRealtime,
  useUserProfileRealtime,
  useVendorProfileRealtime,
};
