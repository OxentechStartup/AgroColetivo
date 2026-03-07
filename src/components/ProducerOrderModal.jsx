import { useState } from 'react'
import { User, Phone, Package, Info } from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
import { Button } from './Button'
import { maskPhone, unmaskPhone } from '../utils/masks'

export function ProducerOrderModal({ campaign, onClose, onSave }) {
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [qty,     setQty]     = useState('')
  const [saving,  setSaving]  = useState(false)

  const tons     = qty ? ((+qty * (campaign.unitWeight ?? 25)) / 1000).toFixed(2) : null
  const canSave  = name.trim().length > 1 && +qty > 0

  const handlePhone = e => setPhone(maskPhone(e.target.value))

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        producerName: name.trim(),
        phone:        unmaskPhone(phone),
        qty:          +qty,
        confirmedAt:  new Date().toISOString().slice(0, 10),
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Adicionar Pedido" onClose={onClose} />
      <ModalBody>
        <div className="form-group">
          <label className="form-label">
            <User size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
            Nome do Produtor
          </label>
          <input
            className="form-input"
            placeholder="João Ferreira"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <Phone size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
            WhatsApp
          </label>
          <input
            className="form-input"
            placeholder="(38) 99123-4567"
            value={phone}
            onChange={handlePhone}
            inputMode="tel"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <Package size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
            Quantidade ({campaign.unit})
          </label>
          <input
            type="number"
            className="form-input"
            placeholder="Ex: 40"
            value={qty}
            onChange={e => setQty(e.target.value)}
            inputMode="numeric"
            min="1"
          />
          {tons && (
            <span className="form-hint">
              <Info size={11} style={{verticalAlign:'middle',marginRight:3}}/>
              ≈ {tons} toneladas
            </span>
          )}
        </div>

        <div style={{
          background:'var(--amber-dim)',border:'1px solid rgba(240,180,41,.2)',
          borderRadius:'var(--r)',padding:'10px 14px',fontSize:'.78rem',color:'var(--text2)',
          lineHeight:1.5
        }}>
          <strong style={{color:'var(--amber)'}}>Múltiplos fornecedores</strong> — O mesmo produtor pode ter pedidos em mais de um fornecedor para a mesma cotação.
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? 'Salvando…' : 'Confirmar Pedido'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
