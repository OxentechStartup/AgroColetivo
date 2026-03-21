import { useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

/**
 * useRealtimeSubscription — Hook para subscrições em tempo real
 *
 * Gerencia subscrições Supabase automaticamente com cleanup
 *
 * Uso:
 * const { data, loading } = useRealtimeSubscription('offers', 'campaign_id', campaignId);
 */

export function useRealtimeSubscription(
  table,
  filterColumn,
  filterValue,
  onDataChange,
) {
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!filterValue) return;

    const subscribe = async () => {
      try {
        subscriptionRef.current = supabase
          .channel(`${table}_${filterColumn}_${filterValue}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table,
              filter: `${filterColumn}=eq.${filterValue}`,
            },
            (payload) => {
              console.log(`📡 ${table} atualizado:`, payload);
              onDataChange?.();
            },
          )
          .subscribe();
      } catch (error) {
        console.error(`❌ Erro ao subscrever ${table}:`, error);
      }
    };

    subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [table, filterColumn, filterValue, onDataChange]);
}

/**
 * useMultipleRealtimeSubscriptions — Subscribe em múltiplas tabelas
 *
 * Uso:
 * useMultipleRealtimeSubscriptions([
 *   { table: 'campaigns', filterColumn: 'pivo_id', filterValue: userId }
 *   { table: 'vendor_campaign_offers', onRefresh: () => loadOffers() }
 * ]);
 */

export function useMultipleRealtimeSubscriptions(subscriptions, onAnyChange) {
  const subscriptionsRef = useRef([]);

  useEffect(() => {
    const setupSubscriptions = async () => {
      // Limpar subscriptions anteriores
      subscriptionsRef.current.forEach((sub) => {
        if (sub?.unsubscribe) sub.unsubscribe();
      });
      subscriptionsRef.current = [];

      // Criar novas subscriptions
      subscriptions.forEach(({ table, filterColumn, filterValue }) => {
        if (!table) return;

        const channel = supabase
          .channel(`${table}_${filterColumn}_${filterValue}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table,
              ...(filterColumn &&
                filterValue && {
                  filter: `${filterColumn}=eq.${filterValue}`,
                }),
            },
            () => {
              console.log(`📡 ${table} atualizado`);
              onAnyChange?.();
            },
          )
          .subscribe();

        subscriptionsRef.current.push(channel);
      });
    };

    setupSubscriptions();

    return () => {
      subscriptionsRef.current.forEach((sub) => {
        if (sub?.unsubscribe) sub.unsubscribe();
      });
    };
  }, [subscriptions, onAnyChange]);
}

export default useRealtimeSubscription;
