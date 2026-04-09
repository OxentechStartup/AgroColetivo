import { useState, useEffect } from "react";
import { User, Phone, MapPin, Save, Trash2, Camera, X } from "lucide-react";
import { updateUser } from "../lib/auth-new.js";
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
        localStorage.setItem(
          "agro_auth",
          JSON.stringify({
            ...current,
            ...result,
            profile_photo_url: photoUrl || null,
          }),
        );
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
              <Camera size={12} className={styles.labelIcon} />
              Foto do perfil
            </label>

            <div className={styles.photoWrap}>
              {photoUrl && (
                <div className={styles.photoPreview}>
                  <img
                    src={photoUrl}
                    alt="Foto do perfil"
                    onError={handlePhotoError}
                  />

                  <button
                    onClick={handleRemovePhoto}
                    className={styles.photoRemove}
                    title="Remover foto"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className={styles.photoControls}>
                <label
                  htmlFor="pivo-photo-input"
                  className={styles.photoButton}
                >
                  <Camera size={16} />
                  {photoUrl ? "Trocar foto" : "Escolher foto"}
                </label>

                <input
                  id="pivo-photo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className={styles.hiddenInput}
                />

                <p className={styles.photoHint}>JPG, PNG ou WebP · Máx. 5 MB</p>
              </div>
            </div>
          </div>

          {/* Nome */}
          <div className="form-group">
            <label className="form-label">
              <User size={12} className={styles.labelIcon} />
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
                <Phone size={12} className={styles.labelIcon} />
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
                <MapPin size={12} className={styles.labelIcon} />
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
          <div className={styles.dangerZone}>
            <button
              onClick={onDeleteAccount}
              title="Deletar minha conta (irreversível)"
              className={styles.dangerButton}
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
