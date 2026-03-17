import { useState } from "react";
import {
  Plus,
  Trash2,
  MessageCircle,
  Phone,
  MapPin,
  FileText,
  Building2,
  Store,
  Send,
} from "lucide-react";
import { Button } from "../components/Button";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "../components/Modal";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { Toast } from "../components/Toast";
import { useToast } from "../hooks/useToast";
import { buildWhatsAppMsg } from "../utils/data";
import { maskPhone, unmaskPhone, displayPhone } from "../utils/masks";
import styles from "./VendorsPage.module.css";

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

// ── Página principal ──────────────────────────────────────────────────────────
export function VendorsPage({ vendors, campaigns, actions, user }) {
  const { addVendor, removeVendor } = actions;
  const { toast, showToast, clearToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [sendTo, setSendTo] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    vendor: null,
    loading: false,
  });

  const canDelete = (vendor) => {
    // Admin pode deletar qualquer um
    if (user?.role === "admin") return true;
    // Gestor pode deletar apenas vendors que ele cadastrou (user_id === seu id)
    if (user?.role === "gestor") return vendor.user_id === user.id;
    return false;
  };

  return (
    <div className={`${styles.page} page-enter`}>
      <Button
        className={styles.addBtn}
        variant="primary"
        onClick={() => setShowAdd(true)}
      >
        <Plus size={15} /> Cadastrar Fornecedor
      </Button>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>
            <Store size={20} /> Fornecedores
          </h1>
          <p className="text-muted">
            Cadastre e gerencie os fornecedores que receberão suas cotações
          </p>
        </div>
      </div>

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
        <div className={styles.grid}>
          {vendors.map((v) => (
            <div key={v.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardInfo}>
                  <div className={styles.vendorName}>{v.name}</div>
                  {v.city && (
                    <div className={styles.vendorCity}>
                      <MapPin size={11} /> {v.city}
                    </div>
                  )}
                </div>
                {canDelete(v) && (
                  <button
                    className={styles.delBtn}
                    onClick={() =>
                      setDeleteConfirm({
                        open: true,
                        vendor: v,
                        loading: false,
                      })
                    }
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className={styles.vendorMeta}>
                <div className={styles.metaRow}>
                  <Phone size={13} color="var(--text3)" />
                  <span>{displayPhone(v.phone)}</span>
                </div>
                {v.notes && (
                  <div className={styles.metaRow}>
                    <FileText
                      size={13}
                      color="var(--text3)"
                      style={{ flexShrink: 0, marginTop: 1 }}
                    />
                    <span>{v.notes}</span>
                  </div>
                )}
              </div>

              <Button variant="whatsapp" block onClick={() => setSendTo(v)}>
                <Send size={14} /> Enviar Cotação
              </Button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddVendorModal
          onClose={() => setShowAdd(false)}
          onSave={async (v) => {
            await addVendor(v);
            showToast("Fornecedor cadastrado!");
          }}
        />
      )}
      {sendTo && (
        <SendCotacaoModal
          vendor={sendTo}
          campaigns={campaigns}
          onClose={() => setSendTo(null)}
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
        {toast && <Toast message={toast.msg} type={toast.type} onDone={clearToast} />}
      )}
    </div>
  );
}
