import { useState, useEffect } from "react";
import { User, Phone, MapPin, Image, Save } from "lucide-react";
import { updateUser } from "../lib/auth";
import { maskPhone, unmaskPhone } from "../utils/masks";
import { Button } from "../components/Button";
import { Toast } from "../components/Toast";
import { useToast } from "../hooks/useToast";
import styles from "./VendorProfilePage.module.css";

export function PivoProfilePage({ user, onSaved }) {
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ? maskPhone(user.phone) : "");
  const [city, setCity] = useState(user?.city ?? "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(
    user?.profile_photo_url ?? "",
  );
  const [saving, setSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  // Sincroniza se user mudar
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ? maskPhone(user.phone) : "");
      setCity(user.city ?? "");
      setProfilePhotoUrl(user.profile_photo_url ?? "");
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
        profile_photo_url: profilePhotoUrl.trim() || null,
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

          <div className="form-group">
            <label className="form-label">
              <Image
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              URL da foto de perfil
            </label>
            <input
              className="form-input"
              placeholder="https://exemplo.com/foto.jpg"
              value={profilePhotoUrl}
              onChange={(e) => setProfilePhotoUrl(e.target.value)}
              type="url"
            />
            {profilePhotoUrl && (
              <div style={{ marginTop: 12 }}>
                <p className="text-muted" style={{ fontSize: "0.8rem" }}>
                  Pré-visualização:
                </p>
                <img
                  src={profilePhotoUrl}
                  alt="Foto de perfil"
                  style={{
                    maxWidth: 120,
                    maxHeight: 120,
                    borderRadius: 8,
                    marginTop: 8,
                    border: "1px solid var(--border)",
                  }}
                  onError={() =>
                    showToast("Erro ao carregar imagem da URL", "error")
                  }
                />
              </div>
            )}
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
        </div>
      </div>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
    </div>
  );
}
