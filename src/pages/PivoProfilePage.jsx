import { useState, useEffect } from "react";
import { User, Phone, MapPin, Save, Trash2, Camera, X } from "lucide-react";
import { updateUser } from "../lib/auth";
import { createImageUrl } from "../lib/imageUpload";
import { maskPhone, unmaskPhone } from "../utils/masks";
import { Button } from "../components/ui/Button";
import { Toast } from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import styles from "./VendorProfilePage.module.css";

export function PivoProfilePage({ user, onSaved, onDeleteAccount }) {
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ? maskPhone(user.phone) : "");
  const [city, setCity] = useState(user?.city ?? "");
  const [photoUrl, setPhotoUrl] = useState(user?.profile_photo_url ?? "");
  const [saving, setSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ? maskPhone(user.phone) : "");
      setCity(user.city ?? "");
      setPhotoUrl(user.profile_photo_url ?? "");
    }
  }, [user?.id]);

  const handlePhotoChange = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // createImageUrl faz todas as validações: tipo, tamanho, dimensões
      const url = await createImageUrl(file);
      setPhotoUrl(url);
      showToast("Foto selecionada com sucesso!", "success");
    } catch (err) {
      showToast(err?.message || "Erro ao processar a foto.", "error");
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl("");
    showToast("Foto removida.");
  };

  const handlePhotoError = (e) => {
    console.error("Erro ao carregar foto do perfil:", e);
    showToast("Erro ao carregar sua foto. Tente carregar novamente.", "error");
    setPhotoUrl("");
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = await updateUser(user.id, {
        name: name.trim(),
        phone: unmaskPhone(phone),
        city: city.trim() || null,
        profile_photo_url: photoUrl || null,
      });
      // Atualiza sessão no localStorage com a foto nova
      try {
        const current = JSON.parse(localStorage.getItem("agro_auth") || "{}");
        localStorage.setItem("agro_auth", JSON.stringify({ ...current, ...result, profile_photo_url: photoUrl || null }));
      } catch {}
      showToast("Perfil atualizado!");
      onSaved?.(result);
    } catch (e) {
      showToast(e?.message || "Erro ao atualizar perfil.", "error");
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
          {/* Foto */}
          <div className="form-group">
            <label className="form-label">
              <Camera
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Foto do perfil
            </label>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {photoUrl && (
                <div
                  style={{
                    position: "relative",
                    width: 100,
                    height: 100,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "var(--bg2)",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={photoUrl}
                    alt="Foto do perfil"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={handlePhotoError}
                  />
                  <button
                    onClick={handleRemovePhoto}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      background: "rgba(0,0,0,0.6)",
                      border: "none",
                      borderRadius: 4,
                      color: "white",
                      cursor: "pointer",
                      padding: "4px 6px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Remover foto"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="pivo-photo-input"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    color: "var(--text1)",
                  }}
                >
                  <Camera size={16} />
                  {photoUrl ? "Trocar foto" : "Escolher foto"}
                </label>
                <input
                  id="pivo-photo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
                <p
                  style={{
                    fontSize: ".75rem",
                    color: "var(--text3)",
                    marginTop: 8,
                  }}
                >
                  JPG, PNG ou WebP · Máx. 5 MB
                </p>
              </div>
            </div>
          </div>

          {/* Nome */}
          <div className="form-group">
            <label className="form-label">
              <User
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Nome completo *
            </label>
            <input
              className="form-input"
              placeholder="João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Telefone + Cidade */}
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

          {/* Zona de perigo */}
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
              title="Deletar minha conta (irreversível)"
              style={{
                background: "none",
                border: "none",
                color: "var(--text3)",
                fontSize: ".8rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 4,
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(220,53,69,.05)";
                e.currentTarget.style.color = "var(--red)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--text3)";
              }}
            >
              <Trash2 size={12} /> Deletar conta
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
