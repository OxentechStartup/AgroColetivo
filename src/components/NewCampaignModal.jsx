import { useState } from "react";
import {
  Wheat,
  Target,
  Calendar,
  Image,
  X,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
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
      <ModalBody
        style={{ maxHeight: "70dvh", overflowY: "auto", paddingBottom: "20px" }}
      >
        {/* Produto */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: ".9rem",
              fontWeight: 600,
              marginBottom: "8px",
              color: "var(--text1)",
            }}
          >
            <Wheat
              size={14}
              style={{ marginRight: "4px", verticalAlign: "middle" }}
            />
            Produto *
          </label>
          <input
            type="text"
            placeholder="Ex: Ração de Milho 22%"
            value={form.product}
            onChange={set("product")}
            autoFocus
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "1rem",
              background: "var(--surface2)",
              boxSizing: "border-box",
              transition: "all 0.2s",
            }}
          />
        </div>

        {/* Imagem */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: ".9rem",
              fontWeight: 600,
              marginBottom: "8px",
              color: "var(--text1)",
            }}
          >
            <Image
              size={14}
              style={{ marginRight: "4px", verticalAlign: "middle" }}
            />
            Imagem (opcional)
          </label>
          {imagePreview ? (
            <div style={{ position: "relative" }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  width: "100%",
                  height: 160,
                  objectFit: "cover",
                  borderRadius: "8px",
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
                  background: "rgba(0,0,0,0.8)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label
              style={{
                display: "block",
                border: "2px dashed var(--border)",
                borderRadius: "8px",
                padding: "32px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: "var(--surface2)",
              }}
            >
              <Image
                size={28}
                style={{ margin: "0 auto 8px", color: "var(--text3)" }}
              />
              <span
                style={{ fontSize: ".9rem", fontWeight: 500, display: "block" }}
              >
                Clique para adicionar
              </span>
              <span
                style={{
                  fontSize: ".75rem",
                  color: "var(--text3)",
                  marginTop: 6,
                  display: "block",
                }}
              >
                JPG, PNG, WebP · Máx 5MB
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: "none" }}
              />
            </label>
          )}
          {error && (
            <div
              style={{
                fontSize: ".8rem",
                color: "var(--red)",
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Grid 2x2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: ".85rem",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              Unidade *
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={form.unit}
                onChange={set("unit")}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: ".9rem",
                  background: "var(--surface2)",
                  cursor: "pointer",
                  appearance: "none",
                  paddingRight: "32px",
                  boxSizing: "border-box",
                }}
              >
                <option>Sacos</option>
                <option>Toneladas</option>
                <option>Quilos</option>
                <option>Fardos</option>
                <option>Litros</option>
                <option>Caixas</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--text3)",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: ".85rem",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              Peso/un (kg)
            </label>
            <input
              type="number"
              placeholder="25"
              value={form.unitWeight}
              onChange={set("unitWeight")}
              min="0"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: ".9rem",
                background: "var(--surface2)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: ".85rem",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              Meta *
            </label>
            <input
              type="number"
              placeholder="300"
              value={form.goalQty}
              onChange={set("goalQty")}
              min="1"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: ".9rem",
                background: "var(--surface2)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: ".85rem",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              Mínimo *
            </label>
            <input
              type="number"
              placeholder="10"
              value={form.minQty}
              onChange={set("minQty")}
              min="1"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: ".9rem",
                background: "var(--surface2)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: ".85rem",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              Máximo
            </label>
            <input
              type="number"
              placeholder="Sem limite"
              value={form.maxQty}
              onChange={set("maxQty")}
              min={form.minQty || 1}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: ".9rem",
                background: "var(--surface2)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: ".85rem",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              <Calendar
                size={12}
                style={{ marginRight: "3px", verticalAlign: "middle" }}
              />
              Prazo
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={set("deadline")}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: ".9rem",
                background: "var(--surface2)",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Resumo */}
        {+form.goalQty > 0 && +form.unitWeight > 0 && (
          <div
            style={{
              background: "var(--primary-dim)",
              border: "1px solid var(--primary-border)",
              borderRadius: "6px",
              padding: "10px",
              fontSize: ".75rem",
              color: "var(--primary)",
              marginBottom: "20px",
            }}
          >
            <strong>Meta:</strong>{" "}
            {((+form.goalQty * +form.unitWeight) / 1000).toFixed(1)} tons
            {+form.minQty > 0 && (
              <>
                {" "}
                | <strong>Mín:</strong>{" "}
                {((+form.minQty * +form.unitWeight) / 1000).toFixed(1)} tons
              </>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave || saving}
          loading={saving}
        >
          Criar cotação
        </Button>
      </ModalFooter>
    </Modal>
  );
}
