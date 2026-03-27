import { useState } from "react";
import { User, Phone, Package, Info, UserCheck } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./ui/Modal";
import { Button } from "./ui/Button";
import { maskPhone, unmaskPhone } from "../utils/masks";
import { supabase } from "../lib/supabase";

async function findProducerByPhone(rawPhone) {
  if (rawPhone.length < 10) return null;
  const { data } = await supabase
    .from("buyers")
    .select("id, name, phone")
    .eq("phone", rawPhone)
    .maybeSingle();
  return data ?? null;
}

export function ProducerOrderModal({ campaign, onClose, onSave }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [returning, setReturning] = useState(null);

  const minQty = campaign.minQty ?? 1;
  const maxQty = campaign.maxQty ?? null; // null = sem limite configurado

  const qtyNum = +qty;
  const tons = qty
    ? ((qtyNum * (campaign.unitWeight ?? 25)) / 1000).toFixed(2)
    : null;
  const qtyOk = qtyNum >= minQty && (maxQty === null || qtyNum <= maxQty);
  const canSave =
    name.trim().length > 1 && unmaskPhone(phone).length >= 10 && qtyOk;

  const handlePhone = async (e) => {
    const masked = maskPhone(e.target.value);
    setPhone(masked);
    setReturning(null);
    const raw = unmaskPhone(masked);
    if (raw.length >= 10) {
      const found = await findProducerByPhone(raw);
      if (found) {
        setName(found.name);
        setReturning(found);
      }
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        producerName: name.trim(),
        phone: unmaskPhone(phone),
        qty: +qty,
        confirmedAt: new Date().toISOString().slice(0, 10),
      });
      onClose();
    } catch (e) {
      console.error("❌ ProducerOrderModal error:", e);
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  const minMsg = minQty > 1 ? ` (mín. ${minQty})` : "";
  const maxMsg = maxQty !== null ? ` · máx. ${maxQty}` : "";

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Adicionar Pedido" onClose={onClose} />
      <ModalBody>
        {/* WhatsApp primeiro — se já cadastrado, preenche nome automaticamente */}
        <div className="form-group">
          <label className="form-label">
            <Phone
              size={12}
              style={{ marginRight: 4, verticalAlign: "middle" }}
            />
            WhatsApp do Produtor
          </label>
          <input
            className="form-input"
            placeholder="(38) 99123-4567"
            value={phone}
            onChange={handlePhone}
            inputMode="tel"
            autoFocus
          />
          {returning && (
            <div
              style={{
                marginTop: 6,
                padding: "6px 10px",
                background: "var(--primary-dim)",
                border: "1px solid var(--primary-border)",
                borderRadius: "var(--r)",
                fontSize: ".75rem",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <UserCheck size={13} />
              Produtor já cadastrado: <strong>{returning.name}</strong>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">
            <User
              size={12}
              style={{ marginRight: 4, verticalAlign: "middle" }}
            />
            Nome do Produtor
          </label>
          <input
            className="form-input"
            placeholder="João Ferreira"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <Package
              size={12}
              style={{ marginRight: 4, verticalAlign: "middle" }}
            />
            Quantidade ({campaign.unit}){minMsg}
            {maxMsg}
          </label>
          <input
            type="number"
            className="form-input"
            placeholder={`Mín. ${minQty}${maxQty !== null ? ` · Máx. ${maxQty}` : ""}`}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="numeric"
            min={minQty}
            max={maxQty ?? undefined}
          />
          {maxQty !== null && maxQty > 0 && qty && qtyNum > maxQty && (
            <span className="form-hint" style={{ color: "var(--red)" }}>
              <Info
                size={11}
                style={{ verticalAlign: "middle", marginRight: 3 }}
              />
              Máximo disponível: {maxQty} {campaign.unit}
            </span>
          )}
          {tons && qtyOk && (
            <span className="form-hint">
              <Info
                size={11}
                style={{ verticalAlign: "middle", marginRight: 3 }}
              />
              ≈ {tons} toneladas
            </span>
          )}
        </div>

        <div
          style={{
            background: "var(--blue-dim)",
            border: "1px solid var(--blue-border)",
            borderRadius: "var(--r)",
            padding: "10px 14px",
            fontSize: ".78rem",
            color: "var(--text2)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--blue)" }}>Retorno automático</strong> —
          Digite o WhatsApp para verificar se o produtor já está cadastrado. Um
          mesmo produtor pode participar de várias cotações.
        </div>
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
          {saving ? "Salvando…" : "Confirmar Pedido"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
