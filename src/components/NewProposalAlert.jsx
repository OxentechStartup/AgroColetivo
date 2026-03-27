import { useEffect, useState, useRef } from "react";
import { useMultipleRealtimeSubscriptions } from "../hooks/useRealtimeSubscription";
import { supabase } from "../lib/supabase";
import styles from "./NewProposalAlert.module.css";

/**
 * NewProposalAlert — Alerta visual quando uma nova proposta chega
 *
 * Monitora mudanças na tabela de ofertas e mostra uma notificação
 * visual clara quando uma proposta é criada para uma campanha.
 *
 * Exemplo:
 * <NewProposalAlert campaignId={campaignId} />
 */

export function NewProposalAlert({ campaignId, onNewProposal }) {
  const [alert, setAlert] = useState(null);
  const lastOffersCountRef = useRef(0);

  // Monitorar mudanças em ofertas para esta campanha
  useMultipleRealtimeSubscriptions(
    campaignId
      ? [
          {
            table: "vendor_campaign_offers",
            filterColumn: "campaign_id",
            filterValue: campaignId,
          },
        ]
      : [],
    async () => {
      // Quando ofertas mudam, buscar dados atualizados
      if (!campaignId) return;

      try {
        const { data: offers, error } = await supabase
          .from("vendor_campaign_offers")
          .select(
            `
            *,
            vendor:vendors(name, city)
          `,
          )
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const currentCount = offers?.length || 0;

        // Se número de ofertas aumentou, é uma nova proposta
        if (currentCount > lastOffersCountRef.current) {
          const newOffer = offers[0]; // Última adicionada

          setAlert({
            id: `${Date.now()}`,
            vendorName: newOffer?.vendor?.name || "Fornecedor",
            vendorCity: newOffer?.vendor?.city,
            price: newOffer?.price_per_unit,
            timestamp: new Date(),
          });

          onNewProposal?.(newOffer);

          // Auto-remover após 6 segundos, mas deixar um pouco visível
          setTimeout(() => {
            setAlert(null);
          }, 6000);
        }

        lastOffersCountRef.current = currentCount;
      } catch (error) {
        console.error("Erro ao buscar ofertas:", error);
      }
    },
    [campaignId],
  );

  if (!alert) return null;

  return (
    <div className={styles.container}>
      <div className={styles.alert}>
        <div className={styles.icon}>📬</div>

        <div className={styles.content}>
          <h3>Nova Proposta Recebida! 🎉</h3>
          <p>
            <strong>{alert.vendorName}</strong>
            {alert.vendorCity && <span> de {alert.vendorCity}</span>}
          </p>
          {alert.price !== undefined && (
            <p className={styles.price}>
              Preço: <strong>R$ {alert.price?.toFixed(2)}</strong>
            </p>
          )}
          <small>Clique para expandir a seção de propostas</small>
        </div>

        <button
          className={styles.close}
          onClick={() => setAlert(null)}
          title="Fechar"
        >
          ×
        </button>
      </div>
    </div>
  );
}
