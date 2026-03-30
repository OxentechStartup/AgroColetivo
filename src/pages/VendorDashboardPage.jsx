import { useState, useEffect, useContext } from "react";
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  CalendarDays,
  Package,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { STATUS_LABEL } from "../utils/data";
import { formatCurrency, maskCurrency, unmaskCurrency } from "../utils/masks";
import { createOffer, fetchVendorOffers } from "../lib/offers";
import { notifyManagerProposalReceived } from "../lib/notifications";
import { LoadingScreen, ErrorScreen } from "../components/LoadingScreen";
import AppContext from "../context/AppContext";
import styles from "./VendorDashboardPage.module.css";

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ── Status chip da proposta ───────────────────────────────────────────────────
function OfferStatusChip({ status }) {
  const map = {
    pending: {
      label: "Aguardando",
      color: "var(--amber)",
      bg: "var(--amber-dim,#fffbeb)",
      border: "var(--amber-border,#fef3c7)",
      Icon: Clock,
    },
    accepted: {
      label: "Aceita ✓",
      color: "var(--primary)",
      bg: "var(--primary-dim)",
      border: "var(--primary-border)",
      Icon: CheckCircle,
    },
    rejected: {
      label: "Recusada",
      color: "var(--text3)",
      bg: "var(--surface3)",
      border: "var(--border)",
      Icon: XCircle,
    },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.Icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        borderRadius: 100,
        padding: "2px 10px",
        fontSize: ".72rem",
        fontWeight: 700,
      }}
    >
      <Icon size={11} /> {s.label}
    </span>
  );
}

// ── Modal para enviar / reeditar proposta ─────────────────────────────────────
function OfferModal({
  campaign,
  vendorId,
  existingOffer,
  onClose,
  onSent,
  vendor,
  reload,
}) {
  const [qty, setQty] = useState(existingOffer?.availableQty?.toString() ?? "");
  const [price, setPrice] = useState(
    existingOffer
      ? Number(existingOffer.pricePerUnit).toFixed(2).replace(".", ",")
      : "",
  );
  const [notes, setNotes] = useState(existingOffer?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const unit = campaign.unit ?? "unidades";
  const priceNum = unmaskCurrency(price) ?? 0;
  const canSend = +qty > 0 && priceNum > 0;

  const handleSend = async () => {
    setSaving(true);
    setErr("");
    try {
      await createOffer(campaign.id, vendorId, {
        pricePerUnit: priceNum,
        availableQty: +qty,
        notes: notes.trim() || null,
      });

      // Notificar o gestor/pivo (best-effort, falha silenciosa)
      if (campaign.pivoId) {
        try {
          const { data: pivoUser } = await fetch(
            `/api/users/${campaign.pivoId}`,
          )
            .then((r) => r.json())
            .catch(() => ({}));

          if (pivoUser?.email) {
            await notifyManagerProposalReceived(pivoUser.email, "Gestor", {
              vendorName: vendor?.name || "Fornecedor",
              productName: campaign.product,
              quantity: qty,
              unit: campaign.unit || "unidades",
              pricePerUnit: priceNum,
              totalPrice: priceNum * qty,
              campaignName: campaign.product,
              campaignLink: `${window.location.origin}/#campaigns`,
            }).catch(() => {});
          }
        } catch {
          // notificação ao gestor é best-effort, não bloqueia o fluxo
        }
      }

      await reload();

      onSent();
      onClose();
    } catch (_e) {
      setErr("Não foi possível enviar sua proposta. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!existingOffer;

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHeader
        title={
          isEdit
            ? `Editar proposta — ${campaign.product}`
            : `Enviar proposta — ${campaign.product}`
        }
        onClose={onClose}
      />
      <ModalBody>
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: ".82rem",
            color: "var(--text2)",
          }}
        >
          {(() => {
            const supplied = campaign.totalSupplied ?? 0;
            const total = campaign.totalOrdered ?? 0;
            const remaining = Math.max(0, total - supplied);
            return supplied > 0 ? (
              <>
                <strong style={{ color: "var(--amber)" }}>
                  Demanda restante: {remaining} {unit}
                </strong>{" "}
                (de {total} total — {supplied} já suprido)
              </>
            ) : (
              <>
                <strong>Demanda total:</strong> {total} {unit}
                {campaign.orders?.length > 0 &&
                  ` de ${campaign.orders.length} comprador(es)`}
              </>
            );
          })()}
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              Quantidade que você fornece ({unit}) *
            </label>
            <input
              type="number"
              min="1"
              className="form-input"
              placeholder="Ex: 500"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="numeric"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Seu preço / {unit.replace(/s$/, "un")} (R$) *
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
          <label className="form-label">
            Observações (frete, prazo, pagamento)
          </label>
          <textarea
            className="form-input"
            rows={2}
            style={{ resize: "vertical" }}
            placeholder="Ex: CIF, entrega em 5 dias, PIX antecipado"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {priceNum > 0 && +qty > 0 && (
          <div
            style={{
              background: "var(--primary-dim)",
              border: "1px solid var(--primary-border)",
              borderRadius: "var(--r)",
              padding: "10px 14px",
              fontSize: ".84rem",
            }}
          >
            <strong style={{ color: "var(--primary)" }}>
              {qty} {unit} × {formatCurrency(priceNum)} ={" "}
              {formatCurrency(priceNum * +qty)}
            </strong>
          </div>
        )}
        {err && (
          <div
            style={{ color: "var(--red)", fontSize: ".82rem", marginTop: 8 }}
          >
            {err}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          disabled={!canSend || saving}
          onClick={handleSend}
        >
          {saving ? (
            "Enviando..."
          ) : (
            <>
              <Send size={14} />{" "}
              {isEdit ? "Atualizar proposta" : "Enviar proposta"}
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ── Card de proposta enviada ──────────────────────────────────────────────────
function MyOfferCard({ offer, campaign, vendorId, onEdited, vendor, reload }) {
  const [showEdit, setShowEdit] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const unit = offer.campaignUnit;

  const canEdit =
    offer.status === "pending" &&
    offer.campaignStatus === "negotiating" &&
    offer.status !== "accepted";

  return (
    <div
      className={styles.quoteCard}
      style={{
        borderLeft: `3px solid ${
          offer.status === "accepted"
            ? "var(--primary)"
            : offer.status === "rejected"
              ? "var(--border2)"
              : "var(--amber,#f59e0b)"
        }`,
      }}
    >
      <div className={styles.quoteTop}>
        <div className={styles.quoteMain}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div className={styles.quoteTitle}>{offer.campaignName}</div>
            <OfferStatusChip status={offer.status} />
          </div>
          <div className={styles.quoteMeta}>
            <Badge status={offer.campaignStatus}>
              {STATUS_LABEL[offer.campaignStatus] ?? offer.campaignStatus}
            </Badge>
            <span style={{ fontWeight: 600, color: "var(--primary)" }}>
              {formatCurrency(offer.pricePerUnit)}/{unit.replace(/s$/, "un")}
            </span>
            <span>
              {offer.availableQty} {unit}
            </span>
            {offer.campaignDeadline && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  color: "var(--text3)",
                  fontSize: ".75rem",
                }}
              >
                <CalendarDays size={11} /> {fmtDate(offer.campaignDeadline)}
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEdit(true)}
            >
              <Send size={12} /> Editar
            </Button>
          )}
          <button
            className={styles.expandBtn}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className={styles.quoteDetail}>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Seu preço</span>
              <span
                className={styles.detailVal}
                style={{ color: "var(--primary)" }}
              >
                {formatCurrency(offer.pricePerUnit)}/{unit.replace(/s$/, "un")}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Quantidade</span>
              <span className={styles.detailVal}>
                {offer.availableQty} {unit}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Total da proposta</span>
              <span className={styles.detailVal} style={{ fontWeight: 700 }}>
                {formatCurrency(offer.pricePerUnit * offer.availableQty)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Enviada em</span>
              <span className={styles.detailVal}>
                {fmtDate(offer.createdAt) || "—"}
              </span>
            </div>
          </div>
          {offer.notes && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                padding: "8px 12px",
                fontSize: ".8rem",
                color: "var(--text2)",
              }}
            >
              <strong>Obs:</strong> {offer.notes}
            </div>
          )}
          {offer.status === "accepted" && (
            <div
              style={{
                background: "var(--primary-dim)",
                border: "1px solid var(--primary-border)",
                borderRadius: "var(--r)",
                padding: "10px 14px",
                fontSize: ".84rem",
                color: "var(--primary)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              <span>✓ Sua proposta foi aceita pelo gestor!</span>
              {offer.campaignStatus === "closed" ? (
                <span
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    borderRadius: 100,
                    padding: "2px 10px",
                    fontSize: ".72rem",
                  }}
                >
                  🚚 Aguardando entrega
                </span>
              ) : (
                <span
                  style={{
                    fontSize: ".78rem",
                    fontWeight: 400,
                    color: "var(--text2)",
                  }}
                >
                  Aguarde contato do gestor.
                </span>
              )}
            </div>
          )}
          {offer.status === "rejected" && (
            <div
              style={{
                background: "var(--surface3)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                padding: "10px 14px",
                fontSize: ".82rem",
                color: "var(--text3)",
              }}
            >
              Esta proposta não foi selecionada nesta rodada.
            </div>
          )}
        </div>
      )}

      {showEdit && campaign && (
        <OfferModal
          campaign={campaign}
          vendorId={vendorId}
          existingOffer={offer}
          onClose={() => setShowEdit(false)}
          onSent={onEdited}
          vendor={vendor}
          reload={reload}
        />
      )}
    </div>
  );
}

// ── Card de cotação disponível para enviar proposta ───────────────────────────
function AvailableCampaignCard({ campaign, vendorId, onSent, vendor, reload }) {
  const [showOffer, setShowOffer] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ordered = campaign.totalOrdered ?? 0;
  const supplied = campaign.totalSupplied ?? 0;
  const remaining = Math.max(0, ordered - supplied);
  const unit = campaign.unit ?? "un";

  return (
    <div
      className={styles.quoteCard}
      style={{ borderLeft: "3px solid var(--primary)" }}
    >
      <div className={styles.quoteTop}>
        <div className={styles.quoteMain}>
          <div className={styles.quoteTitle}>{campaign.product}</div>
          <div className={styles.quoteMeta}>
            <span
              style={{
                background: "var(--primary-dim)",
                color: "var(--primary)",
                border: "1px solid var(--primary-border)",
                borderRadius: 100,
                padding: "1px 8px",
                fontSize: ".72rem",
                fontWeight: 700,
              }}
            >
              ● Aberta para proposta
            </span>
            <span>
              {supplied > 0 ? (
                <>
                  <strong style={{ color: "var(--primary)" }}>
                    {remaining} {unit}
                  </strong>{" "}
                  restantes de {ordered} demandados
                </>
              ) : (
                <>
                  {ordered} {unit} demandados
                </>
              )}
            </span>
            {campaign.deadline && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  color: "var(--text3)",
                  fontSize: ".75rem",
                }}
              >
                <CalendarDays size={11} /> prazo {fmtDate(campaign.deadline)}
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowOffer(true)}
          >
            <Send size={12} /> Enviar proposta
          </Button>
          <button
            className={styles.expandBtn}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className={styles.quoteDetail}>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Demanda total</span>
              <span className={styles.detailVal}>
                {ordered} {unit}
              </span>
            </div>
            {supplied > 0 && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Já suprido</span>
                <span
                  className={styles.detailVal}
                  style={{ color: "var(--primary)" }}
                >
                  {supplied} {unit}
                </span>
              </div>
            )}
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>
                {supplied > 0 ? "Ainda falta" : "Meta"}
              </span>
              <span
                className={styles.detailVal}
                style={
                  supplied > 0
                    ? { color: "var(--amber)", fontWeight: 700 }
                    : undefined
                }
              >
                {supplied > 0 ? remaining : campaign.goalQty} {unit}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Peso/un</span>
              <span className={styles.detailVal}>
                {campaign.unitWeight ?? 25} kg
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Toneladas restantes</span>
              <span className={styles.detailVal}>
                {((remaining * (campaign.unitWeight ?? 25)) / 1000).toFixed(1)}{" "}
                t
              </span>
            </div>
          </div>
        </div>
      )}

      {showOffer && (
        <OfferModal
          campaign={campaign}
          vendorId={vendorId}
          onClose={() => setShowOffer(false)}
          onSent={onSent}
          vendor={vendor}
          reload={reload}
        />
      )}
    </div>
  );
}

// ── Página principal do vendor ────────────────────────────────────────────────
export function VendorDashboardPage({ user: _user, navigate }) {
  const context = useContext(AppContext);

  const {
    campaigns = [],
    ownVendor,
    reload,
  } = context ?? {};

  const { toast, showToast, clearToast } = useToast();

  const [myOffers, setMyOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

  if (!context) {
    return (
      <ErrorScreen
        message="Ocorreu um erro ao carregar a página. Tente recarregar."
        onRetry={() => window.location.reload()}
      />
    );
  }

  // 🔧 Usar ownVendor para vendor próprio (já está atualizado no contexto)
  const vendor = ownVendor ?? null;

  const loadOffers = async () => {
    if (!vendor?.id) return;
    setLoadingOffers(true);
    try {
      setMyOffers(await fetchVendorOffers(vendor.id));
    } catch {
      showToast("Não foi possível carregar suas propostas. Tente novamente.", "error");
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [vendor?.id]); // eslint-disable-line

  const handleSent = () => {
    showToast("Proposta enviada com sucesso!");
    loadOffers();
  };

  if (!vendor)
    return (
      <div className={`${styles.page} page-enter`}>
        <div className={styles.empty}>
          <AlertCircle size={32} style={{ color: "var(--amber)" }} />
          <p>
            <strong>Perfil incompleto</strong>
          </p>
          <p
            style={{ fontSize: "0.95rem", color: "var(--text2)", marginTop: 8 }}
          >
            Preencha todos os campos obrigatórios em <strong>Meu Perfil</strong>{" "}
            para enviar propostas:
          </p>
          <ul
            style={{
              textAlign: "left",
              marginTop: 12,
              marginBottom: 16,
              fontSize: "0.95rem",
              color: "var(--text2)",
              paddingLeft: 24,
            }}
          >
            <li>Nome da empresa</li>
            <li>WhatsApp</li>
            <li>Cidade</li>
            <li>Produtos que você fornece</li>
          </ul>
          <Button
            variant="secondary"
            onClick={() =>
              navigate?.("vendor-profile") ||
              (window.location.hash = "#vendor-profile")
            }
          >
            Ir para Meu Perfil
          </Button>
        </div>
      </div>
    );

  // Cotações em negociação onde o vendor ainda NÃO enviou proposta
  // e que ainda têm demanda a suprir (goal_qty > total já suprido pelos lotes)
  const myOfferCampaignIds = new Set(myOffers.map((o) => o.campaignId));
  const available = campaigns
    .filter((c) => c.status !== "finished")
    .filter((c) => {
      // Verifica se a campanha foi publicada para vendors
      if (!c.publishedToVendors && c.status !== "negotiating") return false;
      if (myOfferCampaignIds.has(c.id)) return false;
      // Calcula quanto já foi suprido pelos lotes aceitos
      const supplied = c.totalSupplied ?? 0;
      const demand = c.totalOrdered ?? 0;
      // Só mostra se ainda há demanda restante
      return supplied < demand;
    });

  // Minhas propostas separadas por status
  const pending = myOffers.filter((o) => o.status === "pending");
  const accepted = myOffers.filter((o) => o.status === "accepted");
  const rejected = myOffers.filter((o) => o.status === "rejected");

  // Para o modal de edição, precisa do objeto campaign completo
  const getCampaign = (id) => campaigns.find((c) => c.id === id) ?? null;

  return (
    <div className={`${styles.page} page-enter`}>
      {/* Cabeçalho */}
      <div className={styles.heading}>
        <div>
          <h1>Minhas Propostas</h1>
          <p className="text-muted">
            Acompanhe e envie propostas para as cotações
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={loadOffers}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: "6px 10px",
              cursor: "pointer",
              color: "var(--text2)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: ".8rem",
            }}
            title="Atualizar"
          >
            <RefreshCw
              size={13}
              style={{
                animation: loadingOffers ? "spin .7s linear infinite" : "none",
              }}
            />{" "}
            Atualizar
          </button>
          <div className={styles.vendorInfo}>
            <span className={styles.vendorName}>{vendor.name}</span>
            {vendor.city && (
              <span className={styles.vendorCity}>{vendor.city}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Cotações abertas para proposta ── */}
      {available.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <Send size={15} style={{ color: "var(--primary)" }} /> Abertas
              para proposta
            </h2>
            <span className={styles.count}>{available.length}</span>
          </div>
          <div className={styles.quoteList}>
            {available.map((c) => (
              <AvailableCampaignCard
                key={c.id}
                campaign={c}
                vendorId={vendor.id}
                onSent={handleSent}
                vendor={vendor}
                reload={reload}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Propostas aguardando resposta ── */}
      {pending.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <Clock size={15} style={{ color: "var(--amber,#f59e0b)" }} />{" "}
              Aguardando resposta do gestor
            </h2>
            <span
              className={styles.count}
              style={{
                background: "var(--amber-dim,#fffbeb)",
                color: "var(--amber,#d97706)",
                borderColor: "var(--amber-border,#fef3c7)",
              }}
            >
              {pending.length}
            </span>
          </div>
          <div className={styles.quoteList}>
            {pending.map((o) => (
              <MyOfferCard
                key={o.id}
                offer={o}
                campaign={getCampaign(o.campaignId)}
                vendorId={vendor.id}
                onEdited={handleSent}
                vendor={vendor}
                reload={reload}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Propostas aceitas ── */}
      {accepted.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <CheckCircle size={15} style={{ color: "var(--primary)" }} />{" "}
              Propostas aceitas
            </h2>
            <span className={styles.count}>{accepted.length}</span>
          </div>
          <div className={styles.quoteList}>
            {accepted.map((o) => (
              <MyOfferCard
                key={o.id}
                offer={o}
                campaign={getCampaign(o.campaignId)}
                vendorId={vendor.id}
                onEdited={handleSent}
                vendor={vendor}
                reload={reload}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Propostas recusadas ── */}
      {rejected.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <XCircle size={15} style={{ color: "var(--text3)" }} /> Não
              selecionadas
            </h2>
            <span
              className={styles.count}
              style={{
                background: "var(--surface3)",
                color: "var(--text3)",
                borderColor: "var(--border)",
              }}
            >
              {rejected.length}
            </span>
          </div>
          <div className={styles.quoteList}>
            {rejected.map((o) => (
              <MyOfferCard
                key={o.id}
                offer={o}
                campaign={getCampaign(o.campaignId)}
                vendorId={vendor.id}
                onEdited={handleSent}
                vendor={vendor}
                reload={reload}
              />
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!loadingOffers && available.length === 0 && myOffers.length === 0 && (
        <div className={styles.empty}>
          <Package size={32} style={{ opacity: 0.3 }} />
          <p style={{ fontWeight: 600 }}>
            Nenhuma cotação disponível no momento.
          </p>
          <p style={{ fontSize: ".8rem", color: "var(--text3)" }}>
            Quando o gestor publicar uma cotação para fornecedores, ela aparece
            aqui.
          </p>
        </div>
      )}

      {loadingOffers && myOffers.length === 0 && (
        <div className={styles.empty}>
          <RefreshCw
            size={24}
            style={{ opacity: 0.3, animation: "spin .7s linear infinite" }}
          />
          <p>Carregando suas propostas…</p>
        </div>
      )}

      {toast && (
        <Toast message={toast.msg} type={toast.type} onDone={clearToast} />
      )}
    </div>
  );
}
