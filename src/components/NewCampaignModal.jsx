import { useState } from "react";
import { Wheat, Scale, Target, Calendar, Info, Image, X } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./Modal";
import { Button } from "./Button";
import { createImageUrl } from "../lib/imageUpload";

const DEFAULT = {
  product: "",
  unit: "sacos",
  unitWeight: "25",
  goalQty: "",
  minQty: "1",
  maxQty: "",
  deadline: "",
  imageUrl: null,
};

export function NewCampaignModal({ onClose, onSave }) {
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSave =
    form.product.trim() &&
    +form.goalQty > 0 &&
    +form.minQty > 0 &&
    (+form.maxQty === 0 || !form.maxQty || +form.maxQty >= +form.minQty);

  const handleImageSelect = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) {
        setError(null);
        return;
      }
      setError(null);

      // createImageUrl faz todas as validações: tipo, tamanho, dimensões
      const url = await createImageUrl(file);
      setImagePreview(url);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err?.message || "Erro ao processar a imagem.");
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setForm((f) => ({ ...f, imageUrl: null }));
    setError(null);
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
        {/* Produto */}
        <div className="form-group">
          <label className="form-label">
            <Wheat
              size={12}
              style={{ marginRight: 4, verticalAlign: "middle" }}
            />
            Produto *
          </label>
          <input
            className="form-input"
            placeholder="Ex: Ração de Milho 22%"
            value={form.product}
            onChange={set("product")}
            autoFocus
          />
        </div>

        {/* Imagem */}
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
                onError={(e) => {
                  e.target.style.display = "none";
                  setError(
                    "Erro ao carregar imagem de preview. Tente novamente.",
                  );
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
                }}
                title="Remover imagem"
              >
                <X size={14} />
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
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
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
                JPG, PNG, WebP · Máx. 5 MB
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                style={{ display: "none" }}
              />
            </label>
          )}

          {error && (
            <span
              style={{
                fontSize: ".8rem",
                color: "var(--red)",
                marginTop: 4,
                display: "block",
              }}
            >
              {error}
            </span>
          )}
        </div>

        {/* Unidade + Peso */}
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

        {/* Metas */}
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              <Target
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              Meta (caminhão cheio) *
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
            <label className="form-label">Mínimo por pedido *</label>
            <input
              type="number"
              className="form-input"
              placeholder="10"
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
              <span style={{ fontSize: ".78rem", color: "var(--red)" }}>
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
          disabled={!canSave || saving}
          onClick={handleSave}
        >
          {saving ? "Criando…" : "Criar Cotação"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
