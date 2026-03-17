import { useState, useEffect } from "react";
import { Building2, Phone, MapPin, FileText, Save, Trash2 } from "lucide-react";
import { updateVendor, createVendor } from "../lib/vendors";
import { maskPhone, unmaskPhone } from "../utils/masks";
import { Button } from "../components/Button";
import { Toast } from "../components/Toast";
import { useToast } from "../hooks/useToast";
import styles from "./VendorProfilePage.module.css";

export function VendorProfilePage({ user, vendor, onSaved, onDeleteAccount }) {
  const [name, setName] = useState(vendor?.name ?? user?.name ?? "");
  const [phone, setPhone] = useState(
    vendor?.phone ? maskPhone(vendor.phone) : "",
  );
  const [city, setCity] = useState(vendor?.city ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  // Sincroniza se vendor mudar (ex: após reload do App)
  useEffect(() => {
    if (vendor) {
      setName(vendor.name ?? user?.name ?? "");
      setPhone(vendor.phone ? maskPhone(vendor.phone) : "");
      setCity(vendor.city ?? "");
      setNotes(vendor.notes ?? "");
    }
  }, [vendor?.id]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: unmaskPhone(phone),
        city: city.trim() || null,
        notes: notes.trim() || null,
      };
      let result;
      if (vendor?.id) {
        result = await updateVendor(vendor.id, payload);
      } else {
        result = await createVendor({ ...payload, user_id: user?.id });
      }
      showToast("Perfil atualizado!");
      onSaved?.(result);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.heading}>
        <h1>Meu Perfil</h1>
        <p className="text-muted">Suas informações como fornecedor</p>
      </div>

      <div className={styles.card}>
        <div className={styles.section}>
          <div className="form-group">
            <label className="form-label">
              <Building2
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Nome da empresa / fornecedor
            </label>
            <input
              className="form-input"
              placeholder="Agropecuária Central"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                <Phone
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />
                WhatsApp
              </label>
              <input
                className="form-input"
                placeholder="(88) 99111-0001"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                inputMode="tel"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <MapPin
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />
                Cidade
              </label>
              <input
                className="form-input"
                placeholder="Ex: Tabuleiro do Norte"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <FileText
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Produtos que você fornece
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Ex: Ração para bovinos, adubos, defensivos agrícolas, sementes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: "vertical", minHeight: 72 }}
            />
          </div>

          <Button
            variant="primary"
            disabled={!name.trim() || saving}
            onClick={handleSave}
          >
            {saving ? (
              "Salvando…"
            ) : (
              <>
                <Save size={14} /> Salvar perfil
              </>
            )}
          </Button>

          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onDeleteAccount}
              style={{
                background: "none",
                border: "none",
                color: "var(--text3)",
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 4,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(220,53,69,0.05)";
                e.currentTarget.style.color = "var(--danger)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--text3)";
              }}
              title="Deletar minha conta (irreversível)"
            >
              <Trash2 size={12} />
              Deletar conta
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast message={toast.msg} type={toast.type} onDone={clearToast} />
      )}
    </div>
  );
}
