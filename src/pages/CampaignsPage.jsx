import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Share2,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Trash2,
  Phone,
  CalendarDays,
  MessageCircle,
  ChevronLeft,
  Send,
  Users,
  DollarSign,
  RotateCcw,
  Package,
  TrendingUp,
  Truck,
  Activity,
  BarChart3,
  ChevronDown,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Building2,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ProgressBar } from "../components/ProgressBar";
import { Toast } from "../components/Toast";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "../components/Modal";
import { NewCampaignModal } from "../components/NewCampaignModal";
import { ProducerOrderModal } from "../components/ProducerOrderModal";
import { ShareModal } from "../components/ShareModal";
import { PublishToVendorsModal } from "../components/PublishToVendorsModal";
import {
  totalOrdered,
  STATUS_LABEL,
  calcSupplyStats,
  daysUntilDeadline,
} from "../utils/data";
import {
  formatCurrency,
  displayPhone,
  maskCurrency,
  unmaskCurrency,
} from "../utils/masks";
import { useToast } from "../hooks/useToast";
import {
  fetchOffers,
  acceptOffer,
  cancelAcceptedOffer,
  settleOffersAfterAccept,
} from "../lib/offers";
import { createLot } from "../lib/lots";
import { supabase } from "../lib/supabase";
import { ROLES } from "../constants/roles";
import styles from "./CampaignsPage.module.css";

const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// SELETOR COMPACTO DE CAMPANHAS (HEADER)
// ═══════════════════════════════════════════════════════════════════════════
function CampaignSelector({ campaigns, selected, onSelect, onNewClick }) {
  const [open, setOpen] = useState(false);
  const active = campaigns.find((c) => c.id === selected);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      {/* Dropdown */}
      <div style={{ position: "relative", minWidth: 0, flex: 1 }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            width: "100%",
            padding: "10px 16px",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--r-lg)",
            background: "var(--surface)",
            cursor: "pointer",
            fontSize: ".92rem",
            fontWeight: 600,
            color: "var(--text)",
            transition: "all 0.2s",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {active ? active.product : "Selecione uma cotação"}
          </span>
          <ChevronDown
            size={16}
            style={{
              flexShrink: 0,
              transform: open ? "rotate(180deg)" : "rotate(0)",
              transition: "transform 0.2s",
              opacity: 0.6,
            }}
          />
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 8,
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--r-lg)",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              zIndex: 100,
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {campaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  width: "100%",
                  padding: "12px 16px",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  borderBottom: "1px solid var(--border)",
                  background:
                    c.id === selected ? "var(--primary-dim)" : "transparent",
                  color: "var(--text)",
                  fontSize: ".88rem",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (c.id !== selected) {
                    e.target.style.background = "var(--surface3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (c.id !== selected) {
                    e.target.style.background = "transparent";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.product}
                  </div>
                </div>
                <Badge status={c.status} style={{ flexShrink: 0 }}>
                  {STATUS_LABEL[c.status]}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Button Nova */}
      <Button
        variant="primary"
        size="sm"
        onClick={onNewClick}
        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
      >
        <Plus size={13} /> Nova
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BARRA DE RESUMO CONSOLIDADA (MÉTRICA ÚNICA)
// ═══════════════════════════════════════════════════════════════════════════
function SummaryBar({ campaign, stats }) {
  const totalOrdered = campaign.orders?.reduce((s, o) => s + o.qty, 0) ?? 0;
  const unit = campaign.unit ?? "un";
  const items = [
    { label: "Pedidos", value: `${totalOrdered} ${unit}`, icon: Package },
    {
      label: "Preço",
      value:
        stats.avgPrice > 0
          ? formatCurrency(stats.avgPrice) + "/" + unit.replace(/s$/, "")
          : "—",
      icon: BarChart3,
    },
    {
      label: "Frete",
      value:
        (campaign.freightTotal ?? 0) > 0
          ? formatCurrency(campaign.freightTotal)
          : "—",
      icon: Truck,
    },
    {
      label: "Taxa",
      value:
        (campaign.markupTotal ?? 0) > 0
          ? formatCurrency(campaign.markupTotal)
          : "—",
      icon: TrendingUp,
    },
    {
      label: "Taxa Plataforma",
      value: stats.feeTotal > 0 ? formatCurrency(stats.feeTotal) : "—",
      icon: Activity,
    },
    {
      label: "Total",
      value:
        stats.totalGross + stats.feeTotal > 0
          ? formatCurrency(stats.totalGross + stats.feeTotal)
          : "—",
      icon: DollarSign,
      primary: true,
    },
  ];
  return (
    <div className={styles.summaryBar}>
      {items.map(({ label, value, icon: Icon, primary }) => (
        <div
          key={label}
          className={`${styles.summaryItem} ${primary ? styles.summaryPrimary : ""}`}
        >
          <Icon size={14} />
          <div className={styles.summaryItemText}>
            <span className={styles.summaryLabel}>{label}</span>
            <span className={styles.summaryValue}>{value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABAS: PEDIDOS (Compradores)
// ═══════════════════════════════════════════════════════════════════════════
function TabOrders({
  campaign,
  actions,
  onApprovePending,
  onRejectPending,
  onNewOrder,
}) {
  const orders = campaign.orders ?? [];
  const pending = campaign.pendingOrders ?? [];
  const unit = campaign.unit ?? "un";

  if (orders.length === 0 && pending.length === 0) {
    return (
      <div className={styles.emptyTab}>
        <Users size={32} style={{ opacity: 0.2 }} />
        <p>Nenhum pedido registrado</p>
        <p style={{ fontSize: ".82rem", color: "var(--text3)" }}>
          Publique a cotação para os compradores
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {pending.length > 0 &&
        campaign.status !== "closed" &&
        campaign.status !== "finished" && (
          <div>
            <div
              style={{
                fontSize: ".75rem",
                fontWeight: 700,
                color: "var(--red)",
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={14} />
              {pending.length} pendente{pending.length !== 1 ? "s" : ""} de
              aprovação
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 10,
              }}
            >
              {pending.map((o) => (
                <div
                  key={o.orderId}
                  style={{
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--r-lg)",
                    padding: "16px",
                    background: "var(--surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--text)",
                        fontSize: ".95rem",
                      }}
                    >
                      {o.producerName}
                    </div>
                    {o.phone && (
                      <div
                        style={{
                          fontSize: ".75rem",
                          color: "var(--text3)",
                          marginTop: 4,
                        }}
                      >
                        {displayPhone(o.phone)}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: ".88rem",
                        color: "var(--primary)",
                        marginTop: 8,
                        fontWeight: 600,
                      }}
                    >
                      Qtd: {o.qty} {unit}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onApprovePending(o.orderId, o)}
                    >
                      <CheckCircle size={13} /> Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRejectPending(o.orderId)}
                    >
                      <XCircle size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {orders.length > 0 && (
        <div>
          <div
            style={{
              fontSize: ".75rem",
              fontWeight: 700,
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle size={14} style={{ color: "var(--primary)" }} />
            {orders.length} aprovado{orders.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {orders.map((o) => (
              <div
                key={o.orderId}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  padding: "10px 14px",
                  background: "var(--surface)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--text)",
                      fontSize: ".88rem",
                    }}
                  >
                    {o.producerName}
                  </span>
                  {o.phone && (
                    <span style={{ color: "var(--text3)", fontSize: ".78rem" }}>
                      {displayPhone(o.phone)}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    color: "var(--primary)",
                    fontWeight: 700,
                    fontSize: ".88rem",
                    flexShrink: 0,
                  }}
                >
                  {o.qty} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {campaign.status !== "closed" && campaign.status !== "finished" && (
        <Button
          variant="secondary"
          onClick={onNewOrder}
          style={{ width: "100%" }}
        >
          <Plus size={14} /> Adicionar pedido
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABAS: PROPOSTAS (Fornecedores)
// ═══════════════════════════════════════════════════════════════════════════
function TabOffers({ campaign, onAccepted, onCancelled }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [err, setErr] = useState("");

  const unit = campaign.unit ?? "un";
  const unitSing = unit.replace(/s$/, "");

  const reload = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      setOffers(await fetchOffers(campaign.id));
    } catch (e) {
      setErr(e?.message || "Erro ao carregar propostas");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => {
    reload();

    // Realtime subscription para atualizar ofertas automaticamente
    const subscription = supabase
      .channel(`vendor_offers_${campaign.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vendor_campaign_offers",
          filter: `campaign_id=eq.${campaign.id}`,
        },
        () => {
          reload();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [reload, campaign.id]);

  const handleAccept = async (offer) => {
    setAccepting(offer.id);
    setErr("");
    try {
      await acceptOffer(offer.id);
      await createLot(campaign.id, {
        vendorId: offer.vendorId,
        vendorName: offer.vendorName,
        qtyAvailable: offer.availableQty,
        pricePerUnit: offer.pricePerUnit,
        notes: offer.notes,
      });
      await settleOffersAfterAccept(campaign.id, offer.id, offer.availableQty);
      await reload();
      onAccepted();
    } catch (e) {
      setErr("Erro ao aceitar: " + (e?.message || "erro desconhecido"));
      setAccepting(null);
    }
  };

  const handleCancel = async (offer) => {
    setCancelling(offer.id);
    setErr("");
    try {
      await cancelAcceptedOffer(offer.id, campaign.id, offer.vendorId);
      await reload();
      onCancelled();
    } catch (e) {
      setErr("Erro ao cancelar: " + (e?.message || "erro desconhecido"));
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "32px 0",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: ".88rem",
        }}
      >
        Carregando propostas…
      </div>
    );
  }

  const pending = offers
    .filter((o) => o.status === "pending")
    .sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  const accepted = offers.filter((o) => o.status === "accepted");
  const rejected = offers.filter((o) => o.status === "rejected");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {err && (
        <div
          style={{
            background: "var(--red-dim)",
            border: "1.5px solid var(--red)",
            color: "var(--red)",
            borderRadius: "var(--r-lg)",
            padding: "12px 16px",
            fontSize: ".88rem",
            fontWeight: 500,
          }}
        >
          {err}
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <div
            style={{
              fontSize: ".75rem",
              fontWeight: 700,
              color: "var(--primary)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={14} /> Aceitas ({accepted.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {accepted.map((o) => (
              <div
                key={o.id}
                style={{
                  border: "1.5px solid var(--primary)",
                  borderRadius: "var(--r-lg)",
                  padding: "16px",
                  background: "var(--primary-dim)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--text)",
                      fontSize: ".95rem",
                    }}
                  >
                    {o.vendorName}
                  </div>
                  <div
                    style={{
                      color: "var(--primary)",
                      fontWeight: 700,
                      fontSize: ".92rem",
                      marginTop: 8,
                    }}
                  >
                    {formatCurrency(o.pricePerUnit)}/{unitSing} ·{" "}
                    <span style={{ color: "var(--text2)", fontWeight: 600 }}>
                      {o.availableQty} {unit}
                    </span>
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: ".82rem",
                        color: "var(--text2)",
                      }}
                    >
                      = {formatCurrency(o.pricePerUnit * o.availableQty)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancelling !== null}
                  onClick={() => handleCancel(o)}
                  style={{
                    color: "var(--red)",
                    borderColor: "var(--red)",
                    flexShrink: 0,
                  }}
                >
                  {cancelling === o.id ? (
                    "Cancelando…"
                  ) : (
                    <>
                      <RotateCcw size={12} /> Cancelar
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <div
            style={{
              fontSize: ".75rem",
              fontWeight: 700,
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {pending.length} pendente{pending.length !== 1 ? "s" : ""} ·
            Ordenado por menor preço
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((offer, idx) => (
              <div
                key={offer.id}
                style={{
                  border: `1.5px solid ${idx === 0 ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: "var(--r-lg)",
                  padding: "16px",
                  background:
                    idx === 0 ? "var(--primary-dim)" : "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {idx === 0 && (
                      <span
                        style={{
                          fontSize: ".65rem",
                          fontWeight: 700,
                          background: "var(--primary)",
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: 99,
                        }}
                      >
                        ★ Melhor preço
                      </span>
                    )}
                    <span style={{ fontWeight: 700, fontSize: ".95rem" }}>
                      {offer.vendorName}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: ".88rem",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      <strong
                        style={{ color: "var(--primary)", fontSize: "1.1rem" }}
                      >
                        {formatCurrency(offer.pricePerUnit)}
                      </strong>
                      <span style={{ color: "var(--text3)" }}>/{unitSing}</span>
                    </span>
                    <span style={{ color: "var(--text2)" }}>
                      Qtd:{" "}
                      <strong>
                        {offer.availableQty} {unit}
                      </strong>
                    </span>
                    <span style={{ color: "var(--text2)", fontWeight: 600 }}>
                      ={" "}
                      {formatCurrency(offer.pricePerUnit * offer.availableQty)}
                    </span>
                  </div>
                  {offer.notes && (
                    <div
                      style={{
                        fontSize: ".78rem",
                        color: "var(--text3)",
                        marginTop: 8,
                        fontStyle: "italic",
                        paddingTop: 8,
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      "{offer.notes}"
                    </div>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={accepting !== null}
                  onClick={() => handleAccept(offer)}
                  style={{ flexShrink: 0 }}
                >
                  {accepting === offer.id ? (
                    "Aceitando…"
                  ) : (
                    <>
                      <CheckCircle size={13} /> Aceitar
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <div
            style={{
              fontSize: ".75rem",
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 10,
            }}
          >
            Recusadas ({rejected.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rejected.map((o) => (
              <div
                key={o.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  padding: "10px 14px",
                  opacity: 0.5,
                  fontSize: ".82rem",
                  display: "flex",
                  justifyContent: "space-between",
                  background: "var(--surface)",
                }}
              >
                <span>{o.vendorName}</span>
                <span>
                  {formatCurrency(o.pricePerUnit)}/{unitSing}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 &&
        accepted.length === 0 &&
        rejected.length === 0 && (
          <div className={styles.emptyTab}>
            <Building2 size={32} style={{ opacity: 0.2 }} />
            <p>Nenhuma proposta recebida</p>
            <p style={{ fontSize: ".82rem", color: "var(--text3)" }}>
              Publique a cotação para os fornecedores enviarem propostas
            </p>
          </div>
        )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABAS: LOTES + FRETE + ENCARGOS (CONSOLIDADA)
// ═══════════════════════════════════════════════════════════════════════════
function TabFinancial({
  campaign,
  stats,
  user,
  onAddLot,
  onRemoveLot,
  onSaveFreight,
}) {
  const [tab, setTab] = useState("lots");
  const [showAddLot, setShowAddLot] = useState(false);
  const [showFreight, setShowFreight] = useState(false);
  const [saving, setSaving] = useState(false);
  const unit = campaign.unit ?? "un";
  const lots = campaign.lots ?? [];
  const orders = campaign.orders ?? [];
  const totalOrdered = orders.reduce((s, o) => s + o.qty, 0);

  return (
    <div>
      {/* Subtabs: Lotes | Frete | Custo */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border)",
          marginBottom: 16,
        }}
      >
        {[
          { id: "lots", label: "1. Lotes Aceitos", icon: Package },
          { id: "freight", label: "2. Frete & Taxas", icon: Truck },
          { id: "costs", label: "3. Custo Final", icon: DollarSign },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "12px 16px",
              fontSize: ".85rem",
              fontWeight: tab === t.id ? 700 : 500,
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom:
                tab === t.id
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
              color: tab === t.id ? "var(--primary)" : "var(--text2)",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Subtab: Lotes */}
      {tab === "lots" && (
        <div>
          {lots.length === 0 ? (
            <div className={styles.emptyTab}>
              <Package size={32} style={{ opacity: 0.2 }} />
              <p>Nenhum lote cadastrado</p>
              <p style={{ fontSize: ".82rem", color: "var(--text3)" }}>
                Aceite uma proposta na aba Propostas
              </p>
              <Button
                variant="primary"
                style={{ marginTop: 12 }}
                onClick={() => setShowAddLot(true)}
              >
                <Plus size={14} /> Adicionar Manual
              </Button>
            </div>
          ) : (
            <>
              {(lots.length > 0 || totalOrdered > 0) && (
                <div
                  style={{
                    background: stats.isFulfilled
                      ? "var(--primary-dim)"
                      : "var(--amber-dim)",
                    border: `1.5px solid ${stats.isFulfilled ? "var(--primary)" : "var(--amber)"}`,
                    borderRadius: "var(--r)",
                    padding: "12px 16px",
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {stats.isFulfilled ? (
                      <CheckCircle2
                        size={16}
                        style={{ color: "var(--primary)" }}
                      />
                    ) : (
                      <AlertCircle
                        size={16}
                        style={{ color: "var(--amber)" }}
                      />
                    )}
                    <span style={{ fontWeight: 600 }}>
                      {stats.isFulfilled
                        ? `✓ Demanda coberta — ${stats.totalAvailable} ${unit}`
                        : `Faltam ${Math.max(0, totalOrdered - stats.totalAvailable)} ${unit}`}
                    </span>
                  </div>
                  {stats.avgPrice > 0 && (
                    <span style={{ fontWeight: 700 }}>
                      Preço:{" "}
                      <strong style={{ color: "var(--primary)" }}>
                        {formatCurrency(stats.avgPrice)}/
                        {unit.replace(/s$/, "")}
                      </strong>
                    </span>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 12,
                }}
              >
                {stats.lotBreakdown.map((lot, idx) => {
                  const usedPct =
                    lot.qtyAvailable > 0
                      ? Math.round((lot.used / lot.qtyAvailable) * 100)
                      : 0;
                  return (
                    <div
                      key={lot.id}
                      style={{
                        border:
                          idx === 0
                            ? "1.5px solid var(--primary)"
                            : "1px solid var(--border)",
                        borderRadius: "var(--r)",
                        padding: "14px",
                        background:
                          idx === 0 ? "var(--primary-dim)" : "var(--surface)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          {idx === 0 && (
                            <div
                              style={{
                                fontSize: ".65rem",
                                fontWeight: 700,
                                background: "var(--primary)",
                                color: "#fff",
                                padding: "2px 8px",
                                borderRadius: 99,
                                marginBottom: 6,
                                display: "inline-block",
                              }}
                            >
                              ★ Principal
                            </div>
                          )}
                          <div style={{ fontWeight: 700 }}>
                            {lot.vendorName}
                          </div>
                          {lot.notes && (
                            <div
                              style={{
                                fontSize: ".72rem",
                                color: "var(--text3)",
                                marginTop: 4,
                              }}
                            >
                              {lot.notes}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => onRemoveLot(campaign.id, lot.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text3)",
                            padding: 0,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                          fontSize: ".82rem",
                        }}
                      >
                        <div>
                          <span style={{ color: "var(--text3)" }}>Qtd</span>
                          <div style={{ fontWeight: 700 }}>
                            {lot.qtyAvailable} {unit}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: "var(--text3)" }}>
                            Preço/{unit.replace(/s$/, "")}
                          </span>
                          <div
                            style={{ fontWeight: 700, color: "var(--primary)" }}
                          >
                            {formatCurrency(lot.pricePerUnit)}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: "var(--text3)" }}>
                            Subtotal
                          </span>
                          <div style={{ fontWeight: 700 }}>
                            {formatCurrency(
                              lot.qtyAvailable * lot.pricePerUnit,
                            )}
                          </div>
                        </div>
                        {totalOrdered > 0 && (
                          <div>
                            <span style={{ color: "var(--text3)" }}>Uso</span>
                            <div style={{ fontWeight: 700 }}>
                              {lot.used}/{totalOrdered} {unit}
                            </div>
                          </div>
                        )}
                      </div>
                      {totalOrdered > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div
                            style={{
                              width: "100%",
                              height: 4,
                              background: "var(--border)",
                              borderRadius: 99,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${usedPct}%`,
                                height: "100%",
                                background:
                                  usedPct >= 100
                                    ? "var(--amber)"
                                    : "var(--primary)",
                                transition: "width 0.15s",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              fontSize: ".65rem",
                              color: "var(--text3)",
                              marginTop: 4,
                              textAlign: "right",
                            }}
                          >
                            {usedPct}%
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 16,
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddLot(true)}
                >
                  <Plus size={14} /> Adicionar Manual
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Subtab: Frete */}
      {tab === "freight" && (
        <div>
          {(campaign.freightTotal ?? 0) > 0 ||
          (campaign.markupTotal ?? 0) > 0 ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: ".7rem",
                      color: "var(--text3)",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Truck size={12} /> FRETE TOTAL
                  </div>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {formatCurrency(campaign.freightTotal ?? 0)}
                  </div>
                  <div
                    style={{
                      fontSize: ".75rem",
                      color: "var(--text3)",
                      marginTop: 6,
                    }}
                  >
                    {formatCurrency(
                      (campaign.freightTotal ?? 0) / Math.max(1, orders.length),
                    )}
                    /comprador
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: ".7rem",
                      color: "var(--text3)",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <TrendingUp size={12} /> TAXA COORD.
                  </div>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {formatCurrency(campaign.markupTotal ?? 0)}
                  </div>
                  <div
                    style={{
                      fontSize: ".75rem",
                      color: "var(--text3)",
                      marginTop: 6,
                    }}
                  >
                    {formatCurrency(
                      (campaign.markupTotal ?? 0) / Math.max(1, orders.length),
                    )}
                    /comprador
                  </div>
                </div>
                {stats.feeTotal > 0 && (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r)",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: ".7rem",
                        color: "var(--text3)",
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Activity size={12} /> TAXA PLATAFORMA
                    </div>
                    <div
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 700,
                        color: "var(--amber)",
                      }}
                    >
                      {formatCurrency(stats.feeTotal)}
                    </div>
                    <div
                      style={{
                        fontSize: ".75rem",
                        color: "var(--text3)",
                        marginTop: 6,
                      }}
                    >
                      {formatCurrency(stats.feeEach)}/comprador
                    </div>
                  </div>
                )}
                <div
                  style={{
                    background: "var(--primary-dim)",
                    border: "1.5px solid var(--primary)",
                    borderRadius: "var(--r)",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: ".7rem",
                      color: "var(--text3)",
                      marginBottom: 8,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    Total encargos
                  </div>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: "var(--primary)",
                    }}
                  >
                    {formatCurrency(
                      (campaign.freightTotal ?? 0) +
                        (campaign.markupTotal ?? 0) +
                        stats.feeTotal,
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: ".75rem",
                      color: "var(--text3)",
                      marginTop: 6,
                    }}
                  >
                    {formatCurrency(
                      ((campaign.freightTotal ?? 0) +
                        (campaign.markupTotal ?? 0) +
                        stats.feeTotal) /
                        Math.max(1, orders.length),
                    )}
                    /comprador
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 16,
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowFreight(true)}
                >
                  <TrendingUp size={14} /> Editar Encargos
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.emptyTab}>
                <Truck size={32} style={{ opacity: 0.2 }} />
                <p>Nenhum frete definido</p>
                <p style={{ fontSize: ".82rem", color: "var(--text3)" }}>
                  Clique abaixo para definir (opcional)
                </p>
                <Button
                  variant="primary"
                  style={{ marginTop: 12 }}
                  onClick={() => setShowFreight(true)}
                >
                  <Truck size={14} /> Definir Frete
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Subtab: Custo final */}
      {tab === "costs" && (
        <div>
          {orders.length > 0 && stats.avgPrice > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid var(--border)" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 0",
                        fontSize: ".78rem",
                        fontWeight: 700,
                        color: "var(--text3)",
                      }}
                    >
                      Comprador
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "10px 0",
                        fontSize: ".78rem",
                        fontWeight: 700,
                        color: "var(--text3)",
                      }}
                    >
                      Qtd
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "10px 0",
                        fontSize: ".78rem",
                        fontWeight: 700,
                        color: "var(--text3)",
                      }}
                    >
                      Produto
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "10px 0",
                        fontSize: ".78rem",
                        fontWeight: 700,
                        color: "var(--text3)",
                      }}
                    >
                      Encargos
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "10px 0",
                        fontSize: ".78rem",
                        fontWeight: 700,
                        color: "var(--primary)",
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, idx) => {
                    const encargosEach =
                      stats.freightEach + stats.markupEach + stats.feeEach;
                    const produto = stats.avgPrice * o.qty;
                    const total = produto + encargosEach;
                    return (
                      <tr
                        key={o.orderId}
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td
                          style={{
                            padding: "12px 0",
                            fontSize: ".82rem",
                            fontWeight: 600,
                          }}
                        >
                          {o.producerName}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "12px 0",
                            fontSize: ".82rem",
                          }}
                        >
                          {o.qty} {unit}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "12px 0",
                            fontSize: ".82rem",
                          }}
                        >
                          {formatCurrency(produto)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "12px 0",
                            fontSize: ".82rem",
                            color: "var(--amber)",
                          }}
                        >
                          {formatCurrency(encargosEach > 0 ? encargosEach : 0)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "12px 0",
                            fontSize: ".82rem",
                            fontWeight: 700,
                            color: "var(--primary)",
                          }}
                        >
                          {formatCurrency(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {stats.totalGross > 0 && (
                <div
                  style={{
                    background: "var(--primary-dim)",
                    border: "1.5px solid var(--primary)",
                    borderRadius: "var(--r)",
                    padding: "14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: ".7rem",
                        color: "var(--text3)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Total geral
                    </div>
                    {stats.feeTotal > 0 && (
                      <div
                        style={{
                          fontSize: ".75rem",
                          color: "var(--text3)",
                          marginTop: 4,
                        }}
                      >
                        Taxa plataforma: {formatCurrency(stats.feeTotal)}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "var(--primary)",
                    }}
                  >
                    {formatCurrency(stats.totalGross + stats.feeTotal)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyTab}>
              <DollarSign size={32} style={{ opacity: 0.2 }} />
              <p>Custo final não disponível</p>
              <p style={{ fontSize: ".82rem", color: "var(--text3)" }}>
                Complete as abas Lotes e Frete primeiro
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      {showAddLot && (
        <ModalAddLot
          unit={unit}
          onClose={() => setShowAddLot(false)}
          onSave={(lot) => {
            onAddLot(campaign.id, lot);
            setShowAddLot(false);
          }}
        />
      )}
      {showFreight && (
        <ModalFreight
          campaign={campaign}
          userName={user?.name}
          onClose={() => setShowFreight(false)}
          onSave={onSaveFreight}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAIS
// ═══════════════════════════════════════════════════════════════════════════

function ModalAddLot({ unit, onClose, onSave }) {
  const [vendorName, setVendorName] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const priceNum = unmaskCurrency(price) ?? 0;
  const canSave = vendorName.trim() && +qty > 0 && priceNum > 0;

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHeader title="Registrar Proposta Manual" onClose={onClose} />
      <ModalBody>
        <p
          style={{
            fontSize: ".82rem",
            color: "var(--text2)",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          Preencha a proposta recebida via WhatsApp ou telefone.
        </p>
        <div className="form-group">
          <label className="form-label">Nome do fornecedor *</label>
          <input
            className="form-input"
            placeholder="Ex: Agropecuária Central"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Qtd ({unit}) *</label>
            <input
              type="number"
              min="1"
              className="form-input"
              placeholder="Ex: 500"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Preço/{unit.replace(/s$/, "")} *
            </label>
            <input
              className="form-input"
              placeholder="0,00"
              value={price}
              onChange={(e) => setPrice(maskCurrency(e.target.value))}
              inputMode="numeric"
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Observações</label>
          <input
            className="form-input"
            placeholder="Ex: Frete incluso"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          disabled={!canSave || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                vendorId: null,
                vendorName: vendorName.trim(),
                qtyAvailable: +qty,
                pricePerUnit: priceNum,
                notes: notes.trim() || null,
              });
              onClose();
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Salvando…" : "Adicionar"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function ModalFreight({ campaign, userName, onClose, onSave }) {
  const toMask = (v) => (v > 0 ? Number(v).toFixed(2).replace(".", ",") : "");
  const [freight, setFreight] = useState(toMask(campaign.freightTotal ?? 0));
  const [markup, setMarkup] = useState(toMask(campaign.markupTotal ?? 0));
  const [saving, setSaving] = useState(false);
  const mask = (setter) => (e) => setter(maskCurrency(e.target.value));
  const fNum = unmaskCurrency(freight) ?? 0;
  const mNum = unmaskCurrency(markup) ?? 0;
  const n = campaign.orders?.length || 1;

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        title={`Frete & Taxa de ${userName ?? "Gestor"}`}
        onClose={onClose}
      />
      <ModalBody>
        <div
          style={{
            background: "var(--surface3)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            padding: "10px 14px",
            fontSize: ".82rem",
            color: "var(--text2)",
            marginBottom: 16,
          }}
        >
          Dividido entre{" "}
          <strong style={{ color: "var(--text)" }}>
            {n} comprador{n !== 1 ? "es" : ""}
          </strong>
          .
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              <Truck
                size={11}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />{" "}
              Frete total (R$)
            </label>
            <input
              className="form-input"
              placeholder="0,00"
              value={freight}
              onChange={mask(setFreight)}
              inputMode="numeric"
            />
            {fNum > 0 && (
              <span className="form-hint">
                → {formatCurrency(fNum / n)}/comprador
              </span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">
              <TrendingUp
                size={11}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />{" "}
              Taxa de {userName ?? "Gestor"} (R$)
            </label>
            <input
              className="form-input"
              placeholder="0,00"
              value={markup}
              onChange={mask(setMarkup)}
              inputMode="numeric"
            />
            {mNum > 0 && (
              <span className="form-hint">
                → {formatCurrency(mNum / n)}/comprador
              </span>
            )}
          </div>
        </div>
        {fNum + mNum > 0 && (
          <div
            style={{
              background: "var(--surface3)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: "10px 14px",
              fontSize: ".84rem",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "var(--text2)" }}>Total encargos</span>
            <strong>{formatCurrency(fNum + mNum)}</strong>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({ freight: fNum, markup: mNum });
              onClose();
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL (CONSOLIDADA)
// ═══════════════════════════════════════════════════════════════════════════

export function CampaignsPage({ campaigns, vendors, actions, user, setPage }) {
  const isAdmin = user?.role === "admin";
  const {
    addCampaign,
    addOrder,
    removeOrder,
    closeCampaign,
    finishCampaign,
    reopenCampaign,
    publishToVendors,
    approvePending,
    rejectPending,
    deleteCampaign,
    reload,
    reloadCampaign,
    addLot,
    removeLot,
    saveFinancials,
  } = actions;

  const { toast, showToast, clearToast } = useToast();

  const [selectedId, setSelectedId] = useState(null);
  const [listSearch, setListSearch] = useState("");
  const [mainTab, setMainTab] = useState("orders");
  const [showNew, setShowNew] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'close'|'reopen'|'delete', id }

  const active = campaigns.find((c) => c.id === selectedId) ?? null;
  const lots = active?.lots ?? [];
  const orders = active?.orders ?? [];
  const stats = calcSupplyStats(
    lots,
    orders,
    active?.freightTotal,
    active?.markupTotal,
    active?.goalQty,
  );

  const run =
    (fn, msg) =>
    async (...args) => {
      try {
        await fn(...args);
        if (msg) showToast(msg);
      } catch (e) {
        showToast(e?.message || "Erro desconhecido", "error");
        throw e; // propaga para o modal não fechar em caso de erro
      }
    };

  const handleApprove = async (orderId, order) => {
    try {
      await approvePending(active.id, orderId);
      showToast("Pedido aprovado!");
      if (order.phone) {
        const phone = order.phone.replace(/\D/g, "");
        const msg = encodeURIComponent(
          `Olá, ${order.producerName}! ✅ Seu pedido de *${order.qty} ${active.unit}* foi aprovado. 🌾`,
        );
        window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
      }
    } catch (e) {
      showToast(e?.message || "Erro ao aprovar pedido", "error");
    }
  };

  const handleSaveFreight = async (vals) => {
    try {
      await saveFinancials(active.id, {
        freight: vals.freight,
        markup: vals.markup,
      });
      showToast("Salvo!");
      await reloadCampaign(active.id);
    } catch (e) {
      showToast(e?.message || "Erro ao salvar", "error");
    }
  };

  if (campaigns.length === 0 && !showNew) {
    return (
      <div className={`${styles.page} page-enter`}>
        <div className={styles.emptyPage}>
          <ClipboardList size={36} style={{ opacity: 0.2 }} />
          <p>Nenhuma cotação criada ainda.</p>
          <Button variant="primary" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Criar primeira cotação
          </Button>
        </div>
      </div>
    );
  }

  if (campaigns.length === 0 && showNew) {
    return (
      <div className={`${styles.page} page-enter`}>
        <div className={styles.emptyPage}>
          <ClipboardList size={36} style={{ opacity: 0.2 }} />
          <p>Nenhuma cotação criada ainda.</p>
        </div>
        <NewCampaignModal
          onClose={() => setShowNew(false)}
          onSave={async (data) => {
            await addCampaign(data);
            showToast("Cotação criada!");
          }}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.page} page-enter`}>
      {/* ── LAYOUT: lista + detalhe ── */}
      <div
        className={`${styles.layout} ${mobileShowDetail ? styles.mobileDetail : ""}`}
      >
        {/* LISTA LATERAL */}
        <div
          className={`${styles.list} ${mobileShowDetail ? styles.listHidden : ""}`}
        >
          <div className={styles.listSearch}>
            <input
              className={styles.listSearchInput}
              placeholder="Buscar cotação…"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
            />
          </div>
          {campaigns.length === 0 ? (
            <div className={styles.emptyList}>
              Nenhuma cotação criada ainda.
            </div>
          ) : (
            (() => {
              const filtered = campaigns.filter(
                (c) =>
                  !listSearch ||
                  c.product.toLowerCase().includes(listSearch.toLowerCase()),
              );
              if (filtered.length === 0)
                return (
                  <div className={styles.emptyList}>
                    Nenhuma cotação encontrada.
                  </div>
                );
              const active = filtered.filter((c) => c.status !== "finished");
              const finished = filtered.filter((c) => c.status === "finished");
              return (
                <>
                  {active.map((c) => {
                    const ord = (c.orders ?? []).reduce((s, o) => s + o.qty, 0);
                    const pct =
                      c.goalQty > 0
                        ? Math.min(100, Math.round((ord / c.goalQty) * 100))
                        : 0;
                    const pend = c.pendingOrders?.length ?? 0;
                    return (
                      <button
                        key={c.id}
                        className={`${styles.item} ${selectedId === c.id ? styles.itemActive : ""}`}
                        onClick={() => {
                          setSelectedId(c.id);
                          setMainTab("orders");
                          setMobileShowDetail(true);
                        }}
                      >
                        <div className={styles.itemTop}>
                          <span className={styles.itemName}>{c.product}</span>
                          <Badge status={c.status} style={{ flexShrink: 0 }}>
                            {STATUS_LABEL[c.status]}
                          </Badge>
                        </div>
                        <div className={styles.itemMeta}>
                          <span>{c.orders?.length ?? 0} compradores</span>
                          <span>{pct}% da meta</span>
                          {pend > 0 && (
                            <span className={styles.pendTag}>
                              {pend} pendente{pend > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {finished.length > 0 && (
                    <>
                      <div
                        style={{
                          fontSize: ".68rem",
                          fontWeight: 700,
                          color: "var(--text3)",
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                          padding: "10px 12px 4px",
                          marginTop: 4,
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        Histórico
                      </div>
                      {finished.map((c) => (
                        <button
                          key={c.id}
                          className={`${styles.item} ${selectedId === c.id ? styles.itemActive : ""}`}
                          style={{ opacity: 0.6 }}
                          onClick={() => {
                            setSelectedId(c.id);
                            setMainTab("orders");
                            setMobileShowDetail(true);
                          }}
                        >
                          <div className={styles.itemTop}>
                            <span className={styles.itemName}>{c.product}</span>
                            <Badge status={c.status}>
                              {STATUS_LABEL[c.status]}
                            </Badge>
                          </div>
                          <div className={styles.itemMeta}>
                            <span>{c.orders?.length ?? 0} compradores</span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </>
              );
            })()
          )}

          {/* Botão flutuante Nova cotação — oculto para admin */}
          {!isAdmin && (
            <div className={styles.listFab}>
              <button
                className={styles.fabBtn}
                onClick={() => setShowNew(true)}
              >
                <Plus size={15} /> Nova cotação
              </button>
            </div>
          )}
        </div>

        {/* DETALHE */}
        <div
          className={`${styles.detail} ${mobileShowDetail ? styles.detailVisible : ""}`}
        >
          {/* Botão voltar - mobile */}
          <button
            className={styles.backBtn}
            onClick={() => {
              setMobileShowDetail(false);
              setSelectedId(null);
            }}
          >
            ← Voltar
          </button>

          {!active ? (
            <div className={styles.noSel}>
              Selecione uma cotação para ver os detalhes
            </div>
          ) : (
            <>
              {/* ── CABEÇALHO DO DETALHE ── */}
              <div className={styles.detailHead}>
                <div className={styles.detailHeadLeft}>
                  <h2 className={styles.detailTitle}>{active.product}</h2>
                  <div className={styles.detailMeta}>
                    <Badge status={active.status}>
                      {STATUS_LABEL[active.status]}
                    </Badge>
                    {active.goalQty > 0 && (
                      <span
                        style={{ fontSize: ".8rem", color: "var(--text3)" }}
                      >
                        Meta:{" "}
                        <strong>
                          {active.goalQty} {active.unit}
                        </strong>
                      </span>
                    )}
                    {active.deadline && (
                      <span
                        style={{ fontSize: ".8rem", color: "var(--text3)" }}
                      >
                        Prazo: <strong>{fmtDate(active.deadline)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* AÇÕES */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexShrink: 0,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {/* Aberta: Publicar + Parar */}
                  {active.status === "open" && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowPublish(true)}
                      >
                        <Send size={13} /> Publicar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmAction({ type: "stop", id: active.id })
                        }
                      >
                        <Lock size={13} /> Parar cotação
                      </Button>
                    </>
                  )}

                  {/* Negociando: Publicado (inativo) + Parar */}
                  {active.status === "negotiating" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        style={{ opacity: 0.5, cursor: "default" }}
                      >
                        <Check size={13} /> Publicado
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmAction({ type: "stop", id: active.id })
                        }
                      >
                        <Lock size={13} /> Parar cotação
                      </Button>
                    </>
                  )}

                  {/* Pausada: Encerrar cotação (definitivo) + Reabrir */}
                  {active.status === "closed" && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          setConfirmAction({ type: "finish", id: active.id })
                        }
                      >
                        <CheckCircle size={13} /> Encerrar cotação
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmAction({ type: "reopen", id: active.id })
                        }
                      >
                        <Unlock size={13} /> Reabrir
                      </Button>
                    </>
                  )}

                  {/* Encerrada: permanente — sem ações */}

                  {/* Apagar: visível em open, negotiating e closed apenas */}
                  {active.status !== "finished" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setConfirmAction({ type: "delete", id: active.id })
                      }
                      style={{
                        color: "var(--red)",
                        borderColor: "var(--red-border)",
                        background: "var(--red-dim)",
                      }}
                    >
                      <Trash2 size={13} /> Apagar
                    </Button>
                  )}
                </div>
              </div>

              {/* ── BANNER PAUSADA ── */}
              {active.status === "closed" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: "var(--amber-dim,#fffbeb)",
                    border: "1px solid var(--amber-border,#fbbf24)",
                    borderRadius: "var(--r-lg)",
                    fontSize: ".82rem",
                    color: "var(--amber,#b45309)",
                  }}
                >
                  <Lock size={14} style={{ flexShrink: 0 }} />
                  <span>
                    Cotação <strong>pausada</strong> — não aceita novos pedidos.
                    Reabra para continuar ou clique em{" "}
                    <strong>Encerrar cotação</strong> para finalizar
                    definitivamente.
                  </span>
                </div>
              )}

              {/* ── BANNER ENCERRADA (histórico) ── */}
              {active.status === "finished" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: "var(--surface3)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-lg)",
                    fontSize: ".82rem",
                    color: "var(--text2)",
                  }}
                >
                  <CheckCircle
                    size={14}
                    style={{ color: "var(--primary)", flexShrink: 0 }}
                  />
                  <span>
                    Cotação <strong>encerrada definitivamente</strong> —
                    disponível apenas no relatório. Esta ação não pode ser
                    desfeita.
                  </span>
                </div>
              )}

              {/* ── SUMMARY BAR ── */}
              <SummaryBar campaign={active} stats={stats} />

              {/* ── TABS ── */}
              <div className={styles.tabs}>
                {[
                  {
                    id: "orders",
                    label: "Pedidos",
                    icon: Users,
                    badge: active.pendingOrders?.length,
                  },
                  {
                    id: "offers",
                    label: "Propostas",
                    icon: Building2,
                    badge: active.lots?.length,
                  },
                  { id: "financial", label: "Financeiro", icon: DollarSign },
                ].map((t) => (
                  <button
                    key={t.id}
                    className={`${styles.tab} ${mainTab === t.id ? styles.tabOn : ""}`}
                    onClick={() => setMainTab(t.id)}
                  >
                    <t.icon size={13} />
                    {t.label}
                    {t.badge > 0 && (
                      <span
                        className={
                          t.id === "offers"
                            ? styles.lotsBadge
                            : styles.pendBadge
                        }
                      >
                        {t.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── TAB CONTENT ── */}
              <div style={{ paddingTop: 16 }}>
                {mainTab === "orders" && (
                  <TabOrders
                    campaign={active}
                    actions={actions}
                    onApprovePending={handleApprove}
                    onRejectPending={(id) =>
                      rejectPending(active.id, id).then(() =>
                        showToast("Recusado"),
                      )
                    }
                    onNewOrder={() => setShowOrder(true)}
                  />
                )}
                {mainTab === "offers" && (
                  <TabOffers
                    campaign={active}
                    onAccepted={() => {
                      showToast("Proposta aceita!");
                      reloadCampaign(active.id);
                      setMainTab("financial");
                    }}
                    onCancelled={() => {
                      showToast("Cancelado");
                      reloadCampaign(active.id);
                    }}
                  />
                )}
                {mainTab === "financial" && (
                  <TabFinancial
                    campaign={active}
                    stats={stats}
                    user={user}
                    onAddLot={run(addLot, "Lote adicionado!")}
                    onRemoveLot={run(removeLot, "Removido")}
                    onSaveFreight={handleSaveFreight}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      {confirmAction &&
        (() => {
          const cfg = {
            stop: {
              title: "Parar cotação",
              body: "A cotação será pausada e não aceitará novos pedidos. Você poderá reabri-la a qualquer momento.",
              confirmLabel: "Parar",
              confirmVariant: "primary",
              onConfirm: async () => {
                await run(closeCampaign, "Cotação pausada!")(confirmAction.id);
                setConfirmAction(null);
              },
            },
            finish: {
              title: "Encerrar cotação definitivamente",
              body: "A cotação será encerrada e irá para o relatório histórico. Ela não aparecerá mais em nenhuma lista ativa e esta ação NÃO pode ser desfeita.",
              confirmLabel: "Encerrar definitivamente",
              confirmVariant: "danger",
              onConfirm: async () => {
                await run(
                  finishCampaign,
                  "Cotação encerrada!",
                )(confirmAction.id);
                setConfirmAction(null);
              },
            },
            reopen: {
              title: "Reabrir cotação",
              body: 'A cotação voltará ao status "Aberta" e poderá receber novos pedidos. Deseja continuar?',
              confirmLabel: "Reabrir",
              confirmVariant: "primary",
              onConfirm: async () => {
                await run(
                  reopenCampaign,
                  "Cotação reaberta!",
                )(confirmAction.id);
                setConfirmAction(null);
              },
            },
            delete: {
              title: "Apagar cotação",
              body: "Esta ação é permanente e não pode ser desfeita. Todos os pedidos e lotes associados serão excluídos do banco de dados. Tem certeza?",
              confirmLabel: "Apagar definitivamente",
              confirmVariant: "danger",
              onConfirm: async () => {
                const id = confirmAction.id;
                setConfirmAction(null);
                setSelectedId(null);
                await run(deleteCampaign, "Cotação apagada")(id);
              },
            },
          }[confirmAction.type];
          if (!cfg) return null;
          return (
            <Modal onClose={() => setConfirmAction(null)}>
              <ModalHeader
                title={cfg.title}
                onClose={() => setConfirmAction(null)}
              />
              <ModalBody>
                <p
                  style={{
                    fontSize: ".88rem",
                    color: "var(--text2)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {cfg.body}
                </p>
                {confirmAction.type === "delete" && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      background: "var(--red-dim)",
                      border: "1px solid var(--red-border)",
                      borderRadius: "var(--r)",
                      fontSize: ".82rem",
                      color: "var(--red)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={14} /> Esta ação não pode ser desfeita.
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant={
                    cfg.confirmVariant === "danger"
                      ? "outline"
                      : cfg.confirmVariant
                  }
                  style={
                    cfg.confirmVariant === "danger"
                      ? {
                          background: "var(--red)",
                          color: "#fff",
                          borderColor: "var(--red)",
                        }
                      : {}
                  }
                  onClick={cfg.onConfirm}
                >
                  {cfg.confirmLabel}
                </Button>
              </ModalFooter>
            </Modal>
          );
        })()}

      {/* MODALS */}
      {showNew && (
        <NewCampaignModal
          onClose={() => setShowNew(false)}
          onSave={run(addCampaign, "Cotação criada!")}
        />
      )}
      {showPublish && active && (
        <PublishToVendorsModal
          campaign={active}
          vendors={vendors}
          onClose={() => setShowPublish(false)}
          onPublish={() => {
            run(publishToVendors(active.id), "Publicada!");
            setShowPublish(false);
          }}
        />
      )}
      {showOrder && active && (
        <ProducerOrderModal
          campaign={active}
          onClose={() => setShowOrder(false)}
          onSave={run(
            (qty, name, phone) =>
              addOrder(active.id, { qty, producerName: name, phone }),
            "Pedido adicionado!",
          )}
        />
      )}
      {toast && (
        <Toast message={toast.msg} type={toast.type} onDone={clearToast} />
      )}
    </div>
  );
}
