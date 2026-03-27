import { useState } from "react";
import {
  Phone,
  ChevronDown,
  ChevronUp,
  Users,
  Store,
  Plus,
  Trash2,
  MessageCircle,
  MapPin,
  FileText,
  Building2,
  Send,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "../components/ui/Modal";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { Toast } from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { calcSupplyStats, buildWhatsAppMsg } from "../utils/data";
import {
  formatCurrency,
  displayPhone,
  maskPhone,
  unmaskPhone,
} from "../utils/masks";
import styles from "./ProducersPage.module.css";

// ── Modal: cadastrar fornecedor ───────────────────────────────────────────────
function AddVendorModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const handlePhone = (e) =>
    setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }));
  const canSave = form.name.trim() && form.phone.length >= 10;

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHeader title="Cadastrar Fornecedor" onClose={onClose} />
      <ModalBody>
        <div className="form-group">
          <label className="form-label">
            <Building2
              size={11}
              style={{ marginRight: 4, verticalAlign: "middle" }}
            />
            Nome / Empresa *
          </label>
          <input
            className="form-input"
            placeholder="Agropecuária Central"
            value={form.name}
            onChange={set("name")}
            autoFocus
          />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              <Phone
                size={11}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              WhatsApp *
            </label>
            <input
              className="form-input"
              placeholder="(88) 99111-0001"
              value={form.phone}
              onChange={handlePhone}
              inputMode="tel"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              <MapPin
                size={11}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Cidade
            </label>
            <input
              className="form-input"
              placeholder="Tabuleiro do Norte"
              value={form.city}
              onChange={set("city")}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">
            <FileText
              size={11}
              style={{ marginRight: 4, verticalAlign: "middle" }}
            />
            Observações
          </label>
          <input
            className="form-input"
            placeholder="Ex: Especialista em ração, melhor preço em milho"
            value={form.notes}
            onChange={set("notes")}
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
              await onSave({ ...form, phone: unmaskPhone(form.phone) });
              onClose();
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Salvando…" : "Cadastrar"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ── Modal: enviar cotação para fornecedor ─────────────────────────────────────
function SendCotacaoModal({ vendor, campaigns, onClose }) {
  const [cId, setCId] = useState("");
  const active = campaigns.filter(
    (c) => c.status === "open" || c.status === "negotiating",
  );
  const sel = active.find((c) => c.id === cId);
  const msg = sel ? buildWhatsAppMsg(sel, vendor) : "";
  const phone = unmaskPhone(vendor.phone ?? "");
  const link = sel
    ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
    : "#";

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        title={`Enviar cotação — ${vendor.name}`}
        onClose={onClose}
      />
      <ModalBody>
        <p
          style={{
            fontSize: ".82rem",
            color: "var(--text2)",
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          O fornecedor receberá a demanda consolidada pelo WhatsApp e poderá
          entrar no sistema para enviar a proposta.
        </p>
        <div className="form-group">
          <label className="form-label">Selecione a cotação</label>
          <select
            className="form-select"
            value={cId}
            onChange={(e) => setCId(e.target.value)}
          >
            <option value="">— Selecione —</option>
            {active.map((c) => (
              <option key={c.id} value={c.id}>
                {c.product}
              </option>
            ))}
          </select>
        </div>
        {sel && (
          <pre
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: "12px 14px",
              fontSize: ".76rem",
              lineHeight: 1.6,
              color: "var(--text2)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            {msg}
          </pre>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <Button
          variant="whatsapp"
          disabled={!sel}
          href={sel ? link : undefined}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={14} /> Abrir no WhatsApp
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// Agrupa todas as participações de um comprador em cotações
function buildBuyerRows(campaigns, role) {
  const map = {};

  // Admin vê todos, gestor exclui finished
  const filter = role === "admin" ? () => true : (c) => c.status !== "finished";

  campaigns.filter(filter).forEach((c) => {
    const stats = calcSupplyStats(
      c.lots ?? [],
      c.orders ?? [],
      c.freightTotal,
      c.markupTotal,
      c.goalQty,
    );
    (c.orders ?? []).forEach((o) => {
      const key = o.producerName;
      if (!map[key]) {
        map[key] = {
          name: o.producerName,
          phone: o.phone,
          entries: [],
          totalQty: 0,
          totalValue: 0,
          hasPrice: false,
        };
      }
      const produto = stats.avgPrice * o.qty;
      const extras = stats.freightEach + stats.markupEach + stats.feeEach;
      const total = produto + extras;
      const hasPrice = stats.avgPrice > 0;

      map[key].entries.push({
        campaign: c.product,
        campaignStatus: c.status,
        qty: o.qty,
        unit: c.unit,
        produto,
        extras,
        total,
        hasPrice,
      });
      map[key].totalQty += o.qty;
      if (hasPrice) {
        map[key].totalValue += total;
        map[key].hasPrice = true;
      }
    });
  });

  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
}

// Card mobile expandível por comprador
function BuyerCard({ buyer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.card}>
      <button className={styles.cardBtn} onClick={() => setOpen((o) => !o)}>
        <div className={styles.cardLeft}>
          <div className={styles.pName}>{buyer.name}</div>
          {buyer.phone && (
            <div className={styles.pPhone}>
              <Phone size={10} /> {displayPhone(buyer.phone)}
            </div>
          )}
        </div>
        <div className={styles.cardRight}>
          <div className={styles.totalVal}>
            {buyer.hasPrice ? formatCurrency(buyer.totalValue) : "—"}
          </div>
          <div className={styles.cardMeta2}>
            {buyer.entries.length} cotação
            {buyer.entries.length !== 1 ? "ões" : ""}
          </div>
        </div>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className={styles.cardBody}>
          {buyer.entries.map((e, i) => (
            <div key={i} className={styles.entryBlock}>
              <div className={styles.detailRow}>
                <span>Produto</span>
                <span style={{ fontWeight: 600 }}>{e.campaign}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Quantidade</span>
                <span>
                  {e.qty} {e.unit}
                </span>
              </div>
              {e.hasPrice && (
                <>
                  <div className={styles.detailRow}>
                    <span>Valor produto</span>
                    <span>{formatCurrency(e.produto)}</span>
                  </div>
                  {e.extras > 0 && (
                    <div className={styles.detailRow}>
                      <span>Frete + Taxas</span>
                      <span>{formatCurrency(e.extras)}</span>
                    </div>
                  )}
                  <div className={`${styles.detailRow} ${styles.detailTotal}`}>
                    <span>Total</span>
                    <span>{formatCurrency(e.total)}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Vendors section
function VendorsList({
  vendors,
  campaigns,
  onAdd,
  onDelete,
  onSendQuote,
  user,
}) {
  return (
    <>
      {vendors.length === 0 ? (
        <div className={styles.empty}>
          <Store
            size={36}
            style={{ opacity: 0.15, display: "block", margin: "0 auto 12px" }}
          />
          <p
            style={{ fontWeight: 600, color: "var(--text2)", marginBottom: 4 }}
          >
            Nenhum fornecedor cadastrado
          </p>
          <p
            style={{
              fontSize: ".82rem",
              color: "var(--text3)",
              lineHeight: 1.5,
            }}
          >
            Use o botão no topo para adicionar fornecedores e poder enviar
            cotações e receber propostas.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "14px",
          }}
        >
          {vendors.map((v) => (
            <div
              key={v.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: ".95rem" }}>
                    {v.name}
                  </div>
                  {v.city && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "var(--text3)",
                        fontSize: ".8rem",
                        marginTop: "4px",
                      }}
                    >
                      <MapPin size={11} /> {v.city}
                    </div>
                  )}
                </div>
                {user?.role === "admin" ||
                  (user?.role === "gestor" && v.user_id === user?.id && (
                    <button
                      onClick={() => onDelete(v)}
                      title="Remover"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text3)",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  fontSize: ".85rem",
                  color: "var(--text2)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Phone size={13} color="var(--text3)" />
                  <span>{displayPhone(v.phone)}</span>
                </div>
                {v.notes && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px",
                    }}
                  >
                    <FileText
                      size={13}
                      color="var(--text3)"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <span>{v.notes}</span>
                  </div>
                )}
              </div>

              <Button
                variant="whatsapp"
                block
                onClick={() => onSendQuote(v)}
                style={{ marginTop: "auto" }}
              >
                <Send size={14} /> Enviar Cotação
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function ProducersPage({ campaigns, vendors, actions, user }) {
  const { addVendor, removeVendor } = actions;
  const { toast, showToast, clearToast } = useToast();
  const [tab, setTab] = useState("buyers"); // "buyers" or "vendors"
  const [search, setSearch] = useState("");
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [sendQuoteTo, setSendQuoteTo] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    vendor: null,
    loading: false,
  });

  // Garante que campaigns tem orders mesmo que undefined
  const campaignsWithOrders = (campaigns ?? []).map((c) => ({
    ...c,
    orders: c.orders ?? [],
    lots: c.lots ?? [],
  }));

  const buyers = buildBuyerRows(campaignsWithOrders, user?.role).filter(
    (b) => !search || b.name.toLowerCase().includes(search.toLowerCase()),
  );

  const buyersCount = buildBuyerRows(campaignsWithOrders, user?.role).length;
  const vendorsCount = vendors?.length ?? 0;

  return (
    <div className={`${styles.page} page-enter`}>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "20px",
          paddingBottom: "12px",
        }}
      >
        <button
          onClick={() => {
            setTab("buyers");
            setSearch("");
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingBottom: "4px",
            borderBottom:
              tab === "buyers" ? "2px solid var(--primary)" : "none",
            color: tab === "buyers" ? "var(--primary)" : "var(--text2)",
            fontSize: ".95rem",
            fontWeight: tab === "buyers" ? 600 : 500,
            transition: "all 0.2s",
          }}
        >
          <Users size={16} /> Compradores{" "}
          {buyersCount > 0 && `(${buyersCount})`}
        </button>
        <button
          onClick={() => {
            setTab("vendors");
            setSearch("");
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingBottom: "4px",
            borderBottom:
              tab === "vendors" ? "2px solid var(--primary)" : "none",
            color: tab === "vendors" ? "var(--primary)" : "var(--text2)",
            fontSize: ".95rem",
            fontWeight: tab === "vendors" ? 600 : 500,
            transition: "all 0.2s",
          }}
        >
          <Store size={16} /> Fornecedores{" "}
          {vendorsCount > 0 && `(${vendorsCount})`}
        </button>
      </div>

      {/* Content */}
      {tab === "buyers" ? (
        <>
          <div className={styles.heading}>
            <div>
              <h1 className={styles.pageTitle}>Compradores</h1>
              <p className="text-muted">
                {buyersCount} comprador{buyersCount !== 1 ? "es" : ""}
                com pedidos aprovados
              </p>
            </div>
          </div>

          {buyers.length > 0 && (
            <div className={styles.filters}>
              <input
                className={styles.searchInput}
                placeholder="Buscar comprador…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {buyers.length === 0 ? (
            <div className={styles.empty}>
              {buyersCount === 0
                ? "Nenhum comprador registrou pedidos ainda."
                : "Nenhum resultado para este filtro."}
            </div>
          ) : (
            <>
              {/* Desktop: tabela */}
              <div className={styles.tableCard}>
                <div className={styles.tableWrap}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Comprador</th>
                        <th>Cotações</th>
                        <th>Qtd Total</th>
                        <th>Frete + Taxas</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyers.map((b, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{b.name}</div>
                            {b.phone && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                  color: "var(--text3)",
                                  fontSize: ".7rem",
                                  marginTop: 2,
                                }}
                              >
                                <Phone size={10} /> {displayPhone(b.phone)}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              color: "var(--text2)",
                              fontSize: ".82rem",
                            }}
                          >
                            {b.entries.map((e) => e.campaign).join(", ")}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {b.entries
                              .map((e) => e.qty + " " + e.unit)
                              .join(" + ")}
                          </td>
                          <td style={{ color: "var(--text2)" }}>
                            {b.entries.reduce((s, e) => s + e.extras, 0) > 0 ? (
                              formatCurrency(
                                b.entries.reduce((s, e) => s + e.extras, 0),
                              )
                            ) : (
                              <span style={{ color: "var(--text3)" }}>—</span>
                            )}
                          </td>
                          <td>
                            {b.hasPrice ? (
                              <strong style={{ color: "var(--primary)" }}>
                                {formatCurrency(b.totalValue)}
                              </strong>
                            ) : (
                              <span style={{ color: "var(--text3)" }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile */}
              <div className={styles.cards}>
                {buyers.map((b, i) => (
                  <BuyerCard key={i} buyer={b} />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div>
              <h1
                className={styles.pageTitle}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Store size={20} /> Fornecedores
              </h1>
              <p className="text-muted">
                Cadastre e gerencie os fornecedores que receberão suas cotações
              </p>
            </div>
          </div>

          <Button
            style={{
              position: "absolute",
              top: "var(--page-pad)",
              right: "var(--page-pad)",
              zIndex: 100,
            }}
            variant="primary"
            onClick={() => setShowAddVendor(true)}
          >
            <Plus size={15} /> Cadastrar Fornecedor
          </Button>

          <VendorsList
            vendors={vendors ?? []}
            campaigns={campaignsWithOrders}
            onAdd={() => setShowAddVendor(true)}
            onDelete={(v) =>
              setDeleteConfirm({ open: true, vendor: v, loading: false })
            }
            onSendQuote={(v) => setSendQuoteTo(v)}
            user={user}
          />
        </>
      )}

      {/* Modals */}
      {showAddVendor && (
        <AddVendorModal
          onClose={() => setShowAddVendor(false)}
          onSave={async (v) => {
            await addVendor(v);
            showToast("Fornecedor cadastrado!");
            setShowAddVendor(false);
          }}
        />
      )}
      {sendQuoteTo && (
        <SendCotacaoModal
          vendor={sendQuoteTo}
          campaigns={campaignsWithOrders}
          onClose={() => setSendQuoteTo(null)}
        />
      )}

      <ConfirmationModal
        open={deleteConfirm.open}
        title="Remover fornecedor"
        message={`Tem certeza que deseja remover "${deleteConfirm.vendor?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        cancelText="Cancelar"
        isDestructive={true}
        loading={deleteConfirm.loading}
        onConfirm={async () => {
          setDeleteConfirm((prev) => ({ ...prev, loading: true }));
          try {
            await removeVendor(deleteConfirm.vendor.id);
            showToast("Fornecedor removido com sucesso");
            setDeleteConfirm({ open: false, vendor: null, loading: false });
          } catch (err) {
            showToast(err?.message || "Erro ao remover fornecedor", "error");
            setDeleteConfirm((prev) => ({ ...prev, loading: false }));
          }
        }}
        onCancel={() =>
          setDeleteConfirm({ open: false, vendor: null, loading: false })
        }
      />

      {toast && (
        <Toast message={toast.msg} type={toast.type} onDone={clearToast} />
      )}
    </div>
  );
}
