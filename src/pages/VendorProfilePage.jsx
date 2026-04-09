import { useState, useEffect } from "react";
import {
  Building2,
  Phone,
  MapPin,
  FileText,
  Save,
  Trash2,
  Camera,
  X,
  AlertCircle,
} from "lucide-react";
import { updateVendor, createVendor } from "../lib/vendors";
import { createImageUrl } from "../lib/imageUpload";
import { maskPhone, unmaskPhone } from "../utils/masks";
import {
  validateVendorProfile,
  getProfileErrorMessage,
} from "../utils/vendorValidation";
import { Button } from "../components/ui/Button";
import { Toast } from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import styles from "./VendorProfilePage.module.css";

export function VendorProfilePage({
  user,
  vendor,
  onSaved,
  onDeleteAccount,
  navigate,
}) {
  const [name, setName] = useState(vendor?.name ?? user?.name ?? "");
  const [phone, setPhone] = useState(
    vendor?.phone ? maskPhone(vendor.phone) : "",
  );
  const [city, setCity] = useState(vendor?.city ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [photoUrl, setPhotoUrl] = useState(vendor?.photo_url ?? "");
  const [saving, setSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  // Sincroniza se vendor mudar após reload
  useEffect(() => {
    if (vendor) {
      setName(vendor.name ?? user?.name ?? "");
      setPhone(vendor.phone ? maskPhone(vendor.phone) : "");
      setCity(vendor.city ?? "");
      setNotes(vendor.notes ?? "");
      setPhotoUrl(vendor.photo_url ?? "");
    }
  }, [vendor?.id]);

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
    console.error("Erro ao carregar foto do vendedor:", e);
    showToast("Erro ao carregar sua foto. Tente carregar novamente.", "error");
    setPhotoUrl("");
  };

  // Valida se o perfil pode ser salvo
  const getValidationError = () => {
    const checks = [
      { field: "name", label: "Nome da empresa" },
      { field: "phone", label: "WhatsApp" },
      { field: "city", label: "Cidade" },
      { field: "notes", label: "Produtos que você fornece" },
    ];

    const missing = checks
      .filter((check) => {
        const value =
          check.field === "name"
            ? name
            : check.field === "phone"
              ? phone
              : check.field === "city"
                ? city
                : notes;
        return !value || !value.trim();
      })
      .map((check) => check.label);

    return missing.length > 0 ? missing : null;
  };

  const validationError = getValidationError();
  const canSave = !validationError && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: unmaskPhone(phone),
        city: city.trim() || null,
        notes: notes.trim() || null,
        photo_url: photoUrl || null,
      };
      let result;
      if (vendor?.id) {
        result = await updateVendor(vendor.id, payload);
      } else {
        result = await createVendor({ ...payload, user_id: user?.id });
      }
      // Persiste photo_url na sessão local do vendor e do user (exibido na Topbar e Sidebar)
      try {
        const current = JSON.parse(localStorage.getItem("agro_auth") || "{}");
        localStorage.setItem(
          "agro_auth",
          JSON.stringify({
            ...current,
            vendor_photo_url: photoUrl || null,
            profile_photo_url: photoUrl || null,
          }),
        );
      } catch {}
      showToast("Perfil atualizado!");
      onSaved?.(result);
    } catch (e) {
      showToast(e?.message || "Erro ao salvar perfil.", "error");
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
          {/* Foto */}
          <div className="form-group">
            <label className="form-label">
              <Camera
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
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
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="vendor-photo-input"
                  className={styles.photoButton}
                >
                  <Camera size={16} />
                  {photoUrl ? "Trocar foto" : "Escolher foto"}
                </label>
                <input
                  id="vendor-photo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
                <p className={styles.photoHint}>
                  JPG, PNG ou WebP · Máx. 5 MB
                </p>
              </div>
            </div>
          </div>

          {/* Nome */}
          <div className="form-group">
            <label className="form-label">
              <Building2
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Nome da empresa / fornecedor *
            </label>
            <input
              className="form-input"
              placeholder="Agropecuária Central"
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
                WhatsApp *
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
                Cidade *
              </label>
              <input
                className="form-input"
                placeholder="Ex: Tabuleiro do Norte"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="form-group">
            <label className="form-label">
              <FileText
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Produtos que você fornece *
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

          {/* Avisos de validação */}
          {validationError && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(217, 119, 6, 0.1)",
                border: "1px solid var(--amber)",
                borderRadius: 6,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <AlertCircle
                size={16}
                style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ fontSize: "0.9rem", color: "var(--text2)" }}>
                <strong>Campos obrigatórios:</strong>
                <ul style={{ marginTop: 6, paddingLeft: 20 }}>
                  {validationError.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            disabled={!canSave}
            onClick={handleSave}
            title={
              validationError ? `Preencha: ${validationError.join(", ")}` : ""
            }
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
              className="btn-danger-ghost"
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
