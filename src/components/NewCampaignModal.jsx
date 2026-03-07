import { useState } from 'react'
import { Wheat, Scale, Target, Calendar } from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
import { Button } from './Button'

const DEFAULT = { product: '', unit: 'sacos', unitWeight: '25', goalQty: '', minQty: '', deadline: '' }

export function NewCampaignModal({ onClose, onSave }) {
  const [form,   setForm]   = useState(DEFAULT)
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const canSave = form.product.trim() && +form.goalQty > 0 && +form.minQty > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        product:    form.product.trim(),
        unit:       form.unit,
        unitWeight: +form.unitWeight,
        goalQty:    +form.goalQty,
        minQty:     +form.minQty,
        deadline:   form.deadline || null,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Nova Cotação" onClose={onClose} />
      <ModalBody>
        <div className="form-group">
          <label className="form-label">
            <Wheat size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
            Produto
          </label>
          <input
            className="form-input"
            placeholder="Ex: Ração de Milho 22%"
            value={form.product}
            onChange={set('product')}
            autoFocus
          />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Unidade</label>
            <select className="form-select" value={form.unit} onChange={set('unit')}>
              <option value="sacos">Sacos</option>
              <option value="toneladas">Toneladas</option>
              <option value="kg">Kg</option>
              <option value="fardos">Fardos</option>
              <option value="litros">Litros</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              <Scale size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
              Peso/unidade (kg)
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="25"
              value={form.unitWeight}
              onChange={set('unitWeight')}
              min="0"
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              <Target size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
              Meta (caminhão cheio)
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="300"
              value={form.goalQty}
              onChange={set('goalQty')}
              min="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mínimo para fechar</label>
            <input
              type="number"
              className="form-input"
              placeholder="200"
              value={form.minQty}
              onChange={set('minQty')}
              min="1"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <Calendar size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
            Prazo
          </label>
          <input
            type="date"
            className="form-input"
            value={form.deadline}
            onChange={set('deadline')}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? 'Criando…' : 'Criar Cotação'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
