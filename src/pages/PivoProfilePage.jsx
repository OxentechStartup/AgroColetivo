import { useState, useEffect } from "react";
import { User, Phone, MapPin, Save, Trash2 } from "lucide-react";
import { updateUser } from "../lib/auth";
import { maskPhone, unmaskPhone } from "../utils/masks";
import { Button } from "../components/Button";
import { Toast } from "../components/Toast";
import { useToast } from "../hooks/useToast";
import styles from "./VendorProfilePage.module.css";

export function PivoProfilePage({ user, onSaved, onDeleteAccount }) {
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ? maskPhone(user.phone) : "");
  const [city, setCity] = useState(user?.city ?? "");
  const [saving, setSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  // Sincroniza se user mudar
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ? maskPhone(user.phone) : "");
      setCity(user.city ?? "");
    }
  }, [user?.id]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: unmaskPhone(phone),
        city: city.trim() || null,
      };
      const result = await updateUser(user.id, payload);
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
        <p className="text-muted">Suas informações de gestor</p>
      </div>

      <div className={styles.card}>
        <div className={styles.section}>
          <div className="form-group">
            <label className="form-label">
              <User
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Nome completo
            </label>
            <input
              className="form-input"
              placeholder="João Silva"
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
                placeholder="Ex: Fortaleza"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
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

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
    </div>
  );
}
