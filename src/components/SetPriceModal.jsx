import { useState } from 'react'
import { DollarSign, Truck, TrendingUp, Info } from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
import { Button } from './Button'
import { formatCurrency, maskCurrency, unmaskCurrency } from '../utils/masks'

export function SetPriceModal({ campaign, onClose, onSave }) {
  const toMask = v => v != null ? Number(v).toFixed(2).replace('.', ',') : ''

  const [price,   setPrice]   = useState(toMask(campaign.pricePerUnit))
  const [freight, setFreight] = useState(toMask(campaign.freightTotal))
  const [markup,  setMarkup]  = useState(toMask(campaign.markupTotal))
  const [saving,  setSaving]  = useState(false)

  const n        = campaign.orders?.length || 1
  const total    = campaign.orders?.reduce((s, o) => s + o.qty, 0) ?? 0
  const pNum     = unmaskCurrency(price)
  const fNum     = unmaskCurrency(freight)
  const mNum     = unmaskCurrency(markup)
  const prodTot  = pNum != null ? pNum * total : null
  const frtEach  = fNum != null && n > 0 ? fNum / n : null
  const mrkEach  = mNum != null && n > 0 ? mNum / n : null
  const grand    = prodTot != null ? prodTot + (fNum ?? 0) + (mNum ?? 0) : null

  const handleMask = setter => e => setter(maskCurrency(e.target.value))

  const handleSave = async () => {
    const p = unmaskCurrency(price)
    if (!p) return
    setSaving(true)
    try {
      await onSave({
        price:   p,
        freight: unmaskCurrency(freight),
        markup:  unmaskCurrency(markup),
      })
      onClose()
    } finally { setSaving(false) }
  }

  const Row = ({ label, value }) => (
    <div style={{display:'flex',justifyContent:'space-between',fontSize:'.875rem',color:'var(--text2)',paddingBottom:8}}>
      <span>{label}</span><span>{value != null ? formatCurrency(value) : '—'}</span>
    </div>
  )

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Preço, Frete & Markup" onClose={onClose} />
      <ModalBody>

        <div className="form-group">
          <label className="form-label">
            <DollarSign size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
            Preço por {campaign.unit?.replace(/s$/, '') ?? 'unidade'} (R$)
          </label>
          <input
            className="form-input"
            placeholder="0,00"
            value={price}
            onChange={handleMask(setPrice)}
            inputMode="numeric"
          />
          <span className="form-hint">Preço negociado com o fornecedor</span>
        </div>

        <div className="form-group">
          <label className="form-label">
            <Truck size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
            Frete total da carga (R$)
          </label>
          <input
            className="form-input"
            placeholder="0,00"
            value={freight}
            onChange={handleMask(setFreight)}
            inputMode="numeric"
          />
          <span className="form-hint">
            Dividido igualmente entre {n} produtor{n!==1?'es':''}
            {frtEach != null ? ` → ${formatCurrency(frtEach)} cada` : ''}
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">
            <TrendingUp size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
            Markup / Taxa de serviço (R$)
          </label>
          <input
            className="form-input"
            placeholder="0,00"
            value={markup}
            onChange={handleMask(setMarkup)}
            inputMode="numeric"
          />
          <span className="form-hint">
            Valor extra dividido entre os compradores
            {mrkEach != null ? ` → ${formatCurrency(mrkEach)} cada` : ''}
          </span>
        </div>

        {grand != null && (
          <div style={{
            background:'var(--surface2)',border:'1px solid var(--border)',
            borderRadius:'var(--r-lg)',padding:'16px',marginTop:4
          }}>
            <Row label="Produto total" value={prodTot} />
            <Row label="Frete"         value={fNum} />
            <Row label="Markup"        value={mNum} />
            <div style={{borderTop:'1px solid var(--border)',paddingTop:10,display:'flex',justifyContent:'space-between',fontWeight:700}}>
              <span style={{color:'var(--text)'}}>Total da compra</span>
              <span style={{color:'var(--primary)',fontSize:'1.05rem'}}>{formatCurrency(grand)}</span>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!unmaskCurrency(price) || saving} onClick={handleSave}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
