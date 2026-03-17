import { useState } from "react";
import {
  Wheat,
  Scale,
  Target,
  Calendar,
  Info,
  Image,
  Loader,
} from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./Modal";
import { Button } from "./Button";
import { uploadCampaignImage, isValidImageFile } from "../lib/imageUpload";

const DEFAULT = {
  product: "",
  unit: "sacos",
  unitWeight: "25",
  goalQty: "",
  minQty: "1",
  maxQty: "",
  deadline: "",
  imageUrl: null,
  imageFile: null,
};

export function NewCampaignModal({ onClose, onSave }) {
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSave =
    form.product.trim() &&
    +form.goalQty > 0 &&
    +form.minQty > 0 &&
    (+form.maxQty === 0 || !form.maxQty || +form.maxQty >= +form.minQty);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validação
    if (!isValidImageFile(file)) {
      setError("Formato de imagem inválido. Aceita: JPG, PNG, WEBP, GIF");
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      setError("Imagem muito grande. Máximo: 5 MB");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (evt) => setImagePreview(evt.target.result);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const imageUrl = await uploadCampaignImage(file);
      setForm((f) => ({ ...f, imageUrl, imageFile: file }));
    } catch (err) {
      setError(err?.message || "Erro ao fazer upload da imagem");
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setForm((f) => ({ ...f, imageUrl: null, imageFile: null }));
    setImagePreview(null);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        product: form.product.trim(),
        unit: form.unit,
        unitWeight: +form.unitWeight,
        goalQty: +form.goalQty,
        minQty: +form.minQty,
        maxQty: form.maxQty ? +form.maxQty : null,
        deadline: form.deadline || null,
        imageUrl: form.imageUrl,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Nova Cotação" onClose={onClose} />
      <ModalBody>
        <div className="form-group">
          <label className="form-label">
            <Wheat
              size={12}
              style={{ marginRight: 4, verticalAlign: "middle" }}
            />
            Produto
          </label>
          <input
            className="form-input"
            placeholder="Ex: Ração de Milho 22%"
            value={form.product}
            onChange={set("product")}
            autoFocus
          />
        </div>

        {/* Image Upload */}
        <div className="form-group">
          <label className="form-label">
            <Image
              size={12}
              style={{ marginRight: 4, verticalAlign: "middle" }}
            />
            Imagem (opcional)
          </label>
          {imagePreview ? (
            <div style={{ position: "relative", marginBottom: 8 }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  width: "100%",
                  height: 150,
                  objectFit: "cover",
                  borderRadius: "var(--r)",
                  border: "1px solid var(--border)",
                }}
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "rgba(0,0,0,0.7)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <label
              style={{
                display: "block",
                border: "2px dashed var(--border)",
                borderRadius: "var(--r)",
                padding: "24px",
                textAlign: "center",
                cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {uploading ? (
                <>
                  <Loader
                    size={24}
                    style={{
                      margin: "0 auto 6px",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <span style={{ fontSize: ".85rem", color: "var(--text2)" }}>
                    Enviando...
                  </span>
                </>
              ) : (
                <>
                  <Image
                    size={24}
                    style={{ margin: "0 auto 6px", color: "var(--text3)" }}
                  />
                  <span style={{ fontSize: ".85rem", color: "var(--text2)" }}>
                    Clique para adicionar imagem
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: ".75rem",
                      color: "var(--text3)",
                      marginTop: 4,
                    }}
                  >
                    Máx: 5 MB
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          )}
          {error && (
            <span className="form-hint" style={{ color: "var(--red)" }}>
              {error}
            </span>
          )}
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Unidade</label>
            <select
              className="form-select"
              value={form.unit}
              onChange={set("unit")}
            >
              <option value="sacos">Sacos</option>
              <option value="toneladas">Toneladas</option>
              <option value="kg">Kg</option>
              <option value="fardos">Fardos</option>
              <option value="litros">Litros</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              <Scale
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Peso/unidade (kg)
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="25"
              value={form.unitWeight}
              onChange={set("unitWeight")}
              min="0"
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              <Target
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Meta (caminhão cheio)
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="300"
              value={form.goalQty}
              onChange={set("goalQty")}
              min="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mínimo por pedido</label>
            <input
              type="number"
              className="form-input"
              placeholder="Ex: 10"
              value={form.minQty}
              onChange={set("minQty")}
              min="1"
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Máximo por pedido</label>
            <input
              type="number"
              className="form-input"
              placeholder="Sem limite"
              value={form.maxQty}
              onChange={set("maxQty")}
              min={form.minQty || 1}
            />
            {form.maxQty && +form.maxQty < +form.minQty && (
              <span className="form-hint" style={{ color: "var(--red)" }}>
                Máximo não pode ser menor que o mínimo
              </span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">
              <Calendar
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Prazo
            </label>
            <input
              type="date"
              className="form-input"
              value={form.deadline}
              onChange={set("deadline")}
            />
          </div>
        </div>
        {+form.goalQty > 0 && +form.unitWeight > 0 && (
          <div
            style={{
              background: "var(--primary-dim)",
              border: "1px solid var(--primary-border)",
              borderRadius: "var(--r)",
              padding: "10px 14px",
              fontSize: ".78rem",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Info size={12} />
            Meta equivale a{" "}
            <strong>
              {((+form.goalQty * +form.unitWeight) / 1000).toFixed(1)} toneladas
            </strong>
            {+form.minQty > 0 && (
              <>
                {" "}
                · Mínimo:{" "}
                <strong>
                  {((+form.minQty * +form.unitWeight) / 1000).toFixed(1)} t
                </strong>
              </>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          disabled={!canSave || saving || uploading}
          onClick={handleSave}
        >
          {saving ? "Criando…" : "Criar Cotação"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
