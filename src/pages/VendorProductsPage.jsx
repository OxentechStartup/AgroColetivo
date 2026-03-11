import { useState, useEffect } from 'react'
import {
  Plus, Package, Trash2, Edit3, Tag, Percent, DollarSign,
  ChevronDown, ChevronUp, Save, X, Truck, CreditCard, Check,
  AlertCircle, Boxes, Scale, Info, Calendar, Leaf, Sparkles,
} from 'lucide-react'
import { calcDiscountedPrice } from '../lib/vendorProducts'
import { formatCurrency, unmaskCurrency, maskCurrency } from '../utils/masks'
import { Button } from '../components/Button'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal'
import { Toast } from '../components/Toast'
import { useToast } from '../hooks/useToast'
import styles from './VendorProductsPage.module.css'

// ── Constantes ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Ração / Nutrição Animal', 'Adubos e Fertilizantes', 'Defensivos Agrícolas',
  'Sementes', 'Corretivos de Solo', 'Suplementos Minerais', 'Outros Insumos',
]
const UNITS = [
  { value: 'sacos',     label: 'Sacos',          hasPeso: true  },
  { value: 'fardos',    label: 'Fardos',          hasPeso: true  },
  { value: 'caixas',    label: 'Caixas',           hasPeso: true  },
  { value: 'kg',        label: 'Quilos (kg)',       hasPeso: false },
  { value: 'toneladas', label: 'Toneladas',         hasPeso: false },
  { value: 'litros',    label: 'Litros',            hasPeso: false },
  { value: 'unidades',  label: 'Unidades',          hasPeso: false },
]
const FREIGHT_OPTS = [
  { value: 'CIF',        label: 'CIF — Frete por conta do fornecedor' },
  { value: 'FOB',        label: 'FOB — Retirada por conta do comprador' },
  { value: 'A_COMBINAR', label: 'A combinar' },
]
const PAYMENT_OPTS = ['À vista', 'PIX antecipado', '30 dias', '30/60 dias', '30/60/90 dias', 'A combinar']

const unitLabel = (v) => UNITS.find(u => u.value === v)?.label ?? v
const unitSing  = (v) => ({ sacos:'saco', fardos:'fardo', caixas:'caixa', kg:'kg', toneladas:'t', litros:'L', unidades:'un' })[v] ?? v
const hasPeso   = (v) => UNITS.find(u => u.value === v)?.hasPeso ?? false
const fmtKg     = (kg) => !kg ? '—' : kg >= 1000 ? `${(kg/1000).toFixed(1)} t` : `${kg} kg`
const freightLabel = (v) => FREIGHT_OPTS.find(f => f.value === v)?.label ?? v

// ── Modal de produto ──────────────────────────────────────────────────────────
function ProductModal({ product, onClose, onSave }) {
  const isEdit = !!product?.id
  const [form, setForm] = useState({
    name:         product?.name         ?? '',
    category:     product?.category     ?? '',
    unit:         product?.unit         ?? 'sacos',
    weightKg:     product?.weightKg     ?? '',
    priceInput:   '',
    priceMode:    'unit',
    stockQty:     product?.stockQty     ?? '',
    freightType:  product?.freightType  ?? 'A_COMBINAR',
    freightValue: '',
    paymentTerms: product?.paymentTerms ?? 'À vista',
    description:  product?.description  ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (!product?.id) return
    const mode = hasPeso(product.unit) ? 'unit' : 'kg'
    const val  = mode === 'unit' ? product.pricePerUnit : product.pricePerKg
    setForm(f => ({
      ...f,
      priceMode:    mode,
      priceInput:   val ? maskCurrency(val.toFixed(2).replace('.', ',')) : '',
      freightValue: product.freightValue ? maskCurrency(product.freightValue.toFixed(2).replace('.', ',')) : '',
    }))
  }, [])

  const handleUnitChange = e => {
    const u = e.target.value
    setForm(f => ({ ...f, unit: u, priceMode: hasPeso(u) ? f.priceMode : 'kg', weightKg: hasPeso(u) ? f.weightKg : '' }))
  }

  const priceNum  = unmaskCurrency(form.priceInput) ?? 0
  const weightNum = Number(form.weightKg) || 0

  const derivedKg   = form.priceMode === 'unit' && priceNum > 0 && weightNum > 0 ? (priceNum / weightNum).toFixed(4) : null
  const derivedUnit = form.priceMode === 'kg'   && priceNum > 0 && weightNum > 0 ? (priceNum * weightNum).toFixed(2) : null

  const resolvedUnit = form.priceMode === 'unit' ? priceNum : (derivedUnit ? Number(derivedUnit) : 0)
  const totalStock   = resolvedUnit * Number(form.stockQty || 0)
  const canSave      = form.name.trim() && priceNum > 0 && Number(form.stockQty) > 0

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        id: product?.id,
        name: form.name, category: form.category, unit: form.unit,
        weightKg:     weightNum || null,
        pricePerUnit: form.priceMode === 'unit' ? priceNum : (derivedUnit ? Number(derivedUnit) : null),
        pricePerKg:   form.priceMode === 'kg'   ? priceNum : (derivedKg   ? Number(derivedKg)   : null),
        stockQty: Number(form.stockQty),
        freightType: form.freightType,
        freightValue: form.freightValue ? unmaskCurrency(String(form.freightValue)) : null,
        paymentTerms: form.paymentTerms,
        description: form.description,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title={isEdit ? 'Editar produto' : 'Cadastrar produto'} onClose={onClose}/>
      <ModalBody>

        <div className="form-group">
          <label className="form-label">Nome do produto *</label>
          <input className="form-input" placeholder="Ex: Ração Bovinos 22% proteína 30kg"
            value={form.name} onChange={set('name')} autoFocus/>
        </div>

        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-select" value={form.category} onChange={set('category')}>
            <option value="">— Selecionar categoria —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className={styles.sectionDivider}>Embalagem e Peso</div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Unidade de venda *</label>
            <select className="form-select" value={form.unit} onChange={handleUnitChange}>
              {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          {hasPeso(form.unit) && (
            <div className="form-group">
              <label className="form-label"><Scale size={12} style={{marginRight:4}}/> Peso por {unitSing(form.unit)} (kg)</label>
              <div className={styles.inputGroup}>
                <input type="number" className="form-input" placeholder="Ex: 30"
                  value={form.weightKg} onChange={set('weightKg')} min="0.1" step="0.1"/>
                <span className={styles.inputAddon}>kg</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.sectionDivider}>Preço</div>
        {hasPeso(form.unit) && (
          <div className={styles.toggleRow}>
            {[['unit', `Por ${unitSing(form.unit)}`], ['kg', 'Por kg']].map(([v, l]) => (
              <button key={v} type="button"
                className={`${styles.toggleBtn} ${form.priceMode === v ? styles.toggleBtnOn : ''}`}
                onClick={() => setForm(f => ({ ...f, priceMode: v, priceInput: '' }))}>
                {v === 'unit' ? <Boxes size={13}/> : <Scale size={13}/>} {l}
              </button>
            ))}
          </div>
        )}
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              R$ por {form.priceMode === 'unit' ? unitSing(form.unit) : 'kg'} *
            </label>
            <div className={styles.inputGroup}>
              <input className="form-input" placeholder="0,00" inputMode="numeric"
                value={form.priceInput} onChange={e => setForm(f => ({ ...f, priceInput: maskCurrency(e.target.value) }))}/>
              <span className={styles.inputAddon}>/{form.priceMode === 'unit' ? unitSing(form.unit) : 'kg'}</span>
            </div>
          </div>
          {hasPeso(form.unit) && weightNum > 0 && priceNum > 0 && (
            <div className="form-group">
              <label className="form-label" style={{color:'var(--text3)'}}>
                {form.priceMode === 'unit' ? '= por kg' : `= por ${unitSing(form.unit)}`}
              </label>
              <div className={styles.derivedBox}>
                <span className={styles.derivedVal}>
                  {form.priceMode === 'unit'
                    ? `${formatCurrency(Number(derivedKg))}/kg`
                    : `${formatCurrency(Number(derivedUnit))}/${unitSing(form.unit)}`}
                </span>
                <span className={styles.derivedSub}>calculado automaticamente</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.sectionDivider}>Estoque</div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Quantidade disponível *</label>
            <div className={styles.inputGroup}>
              <input type="number" className="form-input" placeholder="500"
                value={form.stockQty} onChange={set('stockQty')} min="1"/>
              <span className={styles.inputAddon}>{unitSing(form.unit)}</span>
            </div>
          </div>
          {hasPeso(form.unit) && weightNum > 0 && Number(form.stockQty) > 0 && (
            <div className="form-group">
              <label className="form-label" style={{color:'var(--text3)'}}>Peso total</label>
              <div className={styles.derivedBox}>
                <span className={styles.derivedVal}>{fmtKg(weightNum * Number(form.stockQty))}</span>
                {totalStock > 0 && <span className={styles.derivedSub}>{formatCurrency(totalStock)} em estoque</span>}
              </div>
            </div>
          )}
        </div>

        <div className={styles.sectionDivider}>Logística e Pagamento</div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label"><Truck size={12} style={{marginRight:4}}/> Frete</label>
            <select className="form-select" value={form.freightType}
              onChange={e => setForm(f => ({ ...f, freightType: e.target.value }))}>
              {FREIGHT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {form.freightType === 'CIF' && (
            <div className="form-group">
              <label className="form-label">Valor do frete (R$/{unitSing(form.unit)})</label>
              <div className={styles.inputGroup}>
                <input className="form-input" placeholder="0,00" inputMode="numeric"
                  value={form.freightValue}
                  onChange={e => setForm(f => ({ ...f, freightValue: maskCurrency(e.target.value) }))}/>
                <span className={styles.inputAddon}>/{unitSing(form.unit)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label"><CreditCard size={12} style={{marginRight:4}}/> Pagamento</label>
          <select className="form-select" value={form.paymentTerms} onChange={set('paymentTerms')}>
            {PAYMENT_OPTS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Observações (opcional)</label>
          <textarea className="form-input" rows={2} style={{resize:'vertical',minHeight:52}}
            placeholder="Certificações, composição, validade, condições especiais..."
            value={form.description} onChange={set('description')}/>
        </div>

        {/* Resumo antes de salvar */}
        {canSave && (
          <div className={styles.resumo}>
            <div className={styles.resumoTitle}><Sparkles size={12}/> Resumo</div>
            <div className={styles.resumoGrid}>
              <div><span>Unidade</span><strong>{unitLabel(form.unit)}{weightNum > 0 ? ` · ${weightNum}kg` : ''}</strong></div>
              <div><span>Preço/{unitSing(form.unit)}</span><strong style={{color:'var(--primary)'}}>{formatCurrency(resolvedUnit)}</strong></div>
              {(derivedKg || (form.priceMode === 'kg' && priceNum > 0)) && (
                <div><span>Preço/kg</span><strong>{formatCurrency(form.priceMode === 'kg' ? priceNum : Number(derivedKg || 0))}</strong></div>
              )}
              <div><span>Estoque</span><strong>{form.stockQty} {unitSing(form.unit)}{weightNum > 0 ? ` · ${fmtKg(weightNum * Number(form.stockQty))}` : ''}</strong></div>
              <div><span>Frete</span><strong>{FREIGHT_OPTS.find(f=>f.value===form.freightType)?.label}</strong></div>
              <div><span>Pagamento</span><strong>{form.paymentTerms}</strong></div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? 'Salvando…' : <><Save size={14}/> {isEdit ? 'Salvar' : 'Cadastrar'}</>}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Modal de promoção ─────────────────────────────────────────────────────────
function PromoModal({ product, onClose, onSave }) {
  const [type,  setType]  = useState('percent')
  const [qty,   setQty]   = useState('')
  const [val,   setVal]   = useState('')
  const [desc,  setDesc]  = useState('')
  const [saving, setSaving] = useState(false)

  const basePrice = product?.pricePerUnit ?? 0
  const preview = qty && val && basePrice > 0
    ? calcDiscountedPrice(basePrice, Number(qty), [{
        min_qty: Number(qty), discount_type: type,
        discount_value: Number(val.replace(',', '.')),
      }])
    : null
  const canSave = +qty > 0 && +val.replace(',', '.') > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({ minQty: Number(qty), discountType: type, discountValue: Number(val.replace(',','.')), description: desc.trim() || null })
    } catch(e) {
      // erro tratado pelo pai
    } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={`Promoção — ${product.name}`} onClose={onClose}/>
      <ModalBody>
        <div className={styles.promoInfoBar}>
          <Tag size={13}/>
          Preço base: <strong>{formatCurrency(basePrice)}/{unitSing(product.unit)}</strong>
          {product.pricePerKg > 0 && <span style={{color:'var(--text3)', marginLeft:8}}>{formatCurrency(product.pricePerKg)}/kg</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Tipo de desconto</label>
          <div className={styles.toggleRow}>
            {[['percent','% sobre o total'], ['fixed','R$ por unidade (no total)']].map(([v,l]) => (
              <button key={v} type="button"
                className={`${styles.toggleBtn} ${type===v ? styles.toggleBtnOn : ''}`}
                onClick={() => setType(v)}>
                {v==='percent' ? <Percent size={13}/> : <DollarSign size={13}/>} {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Qtd. mínima para ativar o desconto ({product.unit})</label>
            <input type="number" className="form-input" placeholder="Ex: 100"
              value={qty} onChange={e => setQty(e.target.value)} min="1" autoFocus/>
            {qty && product.weightKg > 0 && (
              <span className="form-hint">{fmtKg(Number(qty) * product.weightKg)} total</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">{type==='percent' ? 'Desconto (%)' : 'Desconto (R$/un)'}</label>
            <input className="form-input" placeholder={type==='percent' ? 'Ex: 5' : 'Ex: 8,00'}
              value={val} onChange={e => setVal(e.target.value)} inputMode="decimal"/>
          </div>
        </div>

        {preview && qty && (
          <div className={styles.promoPreview}>
            <div className={styles.promoPreviewRow}>
              <span>Total sem desconto ({qty} × {formatCurrency(basePrice)})</span>
              <span style={{textDecoration:'line-through',color:'var(--text3)'}}>{formatCurrency(basePrice * Number(qty))}</span>
            </div>
            <div className={styles.promoPreviewRow}>
              <span>Desconto no pedido</span>
              <span style={{color:'var(--red)',fontWeight:600}}>− {formatCurrency(preview.discount * Number(qty))}</span>
            </div>
            <div className={`${styles.promoPreviewRow} ${styles.promoPreviewFinal}`}>
              <strong>Total a pagar</strong>
              <strong style={{color:'var(--primary)',fontSize:'1rem'}}>{formatCurrency(preview.finalPrice * Number(qty))}</strong>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Descrição (opcional)</label>
          <input className="form-input" placeholder='Ex: "Promoção de lançamento"'
            value={desc} onChange={e => setDesc(e.target.value)}/>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? 'Salvando…' : <><Tag size={14}/> Adicionar Promoção</>}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Card de produto ───────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete, onAddPromo, onDeletePromo }) {
  const [expanded,   setExpanded]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const hasPromos  = product.promotions.length > 0
  const totalValue = (product.pricePerUnit ?? 0) * product.stockQty

  return (
    <div className={`${styles.card} ${expanded ? styles.cardOpen : ''}`}>
      {/* Linha principal */}
      <div className={styles.cardMain}>
        <div className={styles.cardLeft}>
          {product.category && <div className={styles.cardCat}>{product.category}</div>}
          <div className={styles.cardName}>{product.name}</div>
          <div className={styles.cardTags}>
            <span className={styles.tagUnit}>{unitLabel(product.unit)}{product.weightKg > 0 ? ` · ${product.weightKg}kg` : ''}</span>
            {product.pricePerUnit > 0 && (
              <span className={styles.tagPrice}>{formatCurrency(product.pricePerUnit)}/{unitSing(product.unit)}</span>
            )}
            {product.pricePerKg > 0 && (
              <span className={styles.tagKg}>{formatCurrency(product.pricePerKg)}/kg</span>
            )}
            <span className={styles.tagStock}><Boxes size={10}/> {product.stockQty} {unitSing(product.unit)}{product.weightKg > 0 ? ` · ${fmtKg(product.weightKg * product.stockQty)}` : ''}</span>
            {hasPromos && <span className={styles.tagPromo}><Tag size={10}/> {product.promotions.length} promoção{product.promotions.length > 1 ? 'ões' : ''}</span>}
          </div>
          {product.description && <div className={styles.cardDesc}>{product.description}</div>}
        </div>

        <div className={styles.cardRight}>
          {totalValue > 0 && <div className={styles.cardValue}>{formatCurrency(totalValue)}</div>}
          <div className={styles.cardActions}>
            <button className={styles.actionBtn} title="Promoção" onClick={() => onAddPromo(product)}><Tag size={13}/></button>
            <button className={styles.actionBtn} title="Editar"   onClick={() => onEdit(product)}><Edit3 size={13}/></button>
            <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} title="Remover" onClick={() => setConfirmDel(true)}><Trash2 size={13}/></button>
            <button className={`${styles.actionBtn} ${styles.expandBtn}`} onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmação de exclusão */}
      {confirmDel && (
        <div className={styles.confirmBar}>
          <span>Remover <strong>{product.name}</strong>?</span>
          <div style={{display:'flex',gap:6}}>
            <Button variant="outline" size="sm" onClick={() => setConfirmDel(false)}>Não</Button>
            <Button variant="danger"  size="sm" onClick={() => { setConfirmDel(false); onDelete(product.id) }}>Remover</Button>
          </div>
        </div>
      )}

      {/* Painel expandido */}
      {expanded && (
        <div className={styles.cardDetail}>
          <div className={styles.specGrid}>
            {[
              ['Peso/emb.', product.weightKg > 0 ? `${product.weightKg} kg` : '—'],
              ['Preço/'+unitSing(product.unit), product.pricePerUnit > 0 ? formatCurrency(product.pricePerUnit) : '—', 'var(--primary)'],
              ['Preço/kg',  product.pricePerKg  > 0 ? formatCurrency(product.pricePerKg)  : '—'],
              ['Estoque',   `${product.stockQty} ${product.unit}${product.weightKg > 0 ? ` (${fmtKg(product.weightKg * product.stockQty)})` : ''}`],
              ['Frete',     freightLabel(product.freightType)],
              ['Pagamento', product.paymentTerms],
              ['Valor total', product.pricePerUnit > 0 ? formatCurrency(product.pricePerUnit * product.stockQty) : '—', 'var(--primary)'],
            ].map(([lbl, val, color]) => (
              <div key={lbl} className={styles.specItem}>
                <span className={styles.specLbl}>{lbl}</span>
                <span className={styles.specVal} style={color ? {color} : {}}>{val}</span>
              </div>
            ))}
          </div>

          {/* Promoções */}
          <div className={styles.promoSection}>
            <div className={styles.promoHeader}>
              <span><Tag size={11}/> Promoções por volume</span>
              <button className={styles.addPromoBtn} onClick={() => onAddPromo(product)}>
                <Plus size={11}/> Adicionar
              </button>
            </div>
            {product.promotions.length === 0 ? (
              <div className={styles.promoEmpty}><AlertCircle size={12}/> Nenhuma promoção cadastrada</div>
            ) : (
              <div className={styles.promoList}>
                {product.promotions.map(p => {
                  const base = product.pricePerUnit ?? 0
                  const { finalPrice, discount } = calcDiscountedPrice(base, p.min_qty, [p])
                  return (
                    <div key={p.id} className={styles.promoChip}>
                      <div className={styles.promoChipLeft}>
                        <span className={styles.promoChipQty}>≥ {p.min_qty} {product.unit}</span>
                        <span className={styles.promoChipVal}>
                          {p.discount_type === 'percent'
                            ? `−${p.value ?? p.discount_value}% no pedido`
                            : `−${formatCurrency(p.value ?? p.discount_value)}/un`}
                          {' → '}pedido de {p.min_qty} {product.unit}:
                          {' '}<strong style={{color:'var(--primary)'}}>
                            {formatCurrency(finalPrice * p.min_qty)}
                          </strong>
                          <span style={{color:'var(--text3)',marginLeft:5}}>
                            (economia: {formatCurrency(discount * p.min_qty)})
                          </span>
                        </span>
                        {p.description && <span className={styles.promoChipDesc}>{p.description}</span>}
                      </div>
                      <button className={styles.promoChipDel} onClick={() => onDeletePromo(p.id, product.id)}><X size={11}/></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Simulador */}
          {product.pricePerUnit > 0 && product.promotions.length > 0 && (
            <PriceSimulator product={product}/>
          )}
        </div>
      )}
    </div>
  )
}

function PriceSimulator({ product }) {
  const [qty, setQty] = useState('')
  const result = qty ? calcDiscountedPrice(product.pricePerUnit, Number(qty), product.promotions) : null
  return (
    <div className={styles.sim}>
      <div className={styles.simTitle}>🧮 Simulador</div>
      <div className={styles.simRow}>
        <input type="number" className={`form-input ${styles.simInput}`}
          placeholder={`Qtd em ${product.unit}`} value={qty}
          onChange={e => setQty(e.target.value)} min="1"/>
        {result && (
          <div className={styles.simResult}>
            {result.discount > 0 ? (
              <>
                <span className={styles.simOld}>Sem desconto: {formatCurrency(product.pricePerUnit * Number(qty))}</span>
                <span className={styles.simNew}>Total: {formatCurrency(result.finalPrice * Number(qty))}</span>
                <span className={styles.simSave}><Check size={10}/> Economia no pedido: {formatCurrency(result.discount * Number(qty))}</span>
              </>
            ) : (
              <span className={styles.simNew}>Total: {formatCurrency(result.finalPrice * Number(qty))} — sem desconto</span>
            )}
            {product.weightKg > 0 && <span className={styles.simTotal}>{fmtKg(product.weightKg * Number(qty))} · {formatCurrency(result.finalPrice)}/un</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export function VendorProductsPage({ user, vendor, products = [], loading = false, onSave, onDelete, onAddPromo, onDeletePromo }) {
  const [editProduct, setEditProduct] = useState(null)
  const [promoTarget, setPromoTarget] = useState(null)
  const [filter,      setFilter]      = useState('all')
  const { toast, showToast, clearToast } = useToast()

  const handleSave = async (data) => {
    try {
      await onSave(data)
      showToast(data.id ? 'Produto atualizado!' : 'Produto cadastrado!')
    } catch (e) { showToast(e.message, 'error'); throw e }
  }

  const handleDelete = async (id) => {
    try { await onDelete(id); showToast('Produto removido.') }
    catch (e) { showToast(e.message, 'error') }
  }

  const handleAddPromo = async (promo) => {
    try {
      await onAddPromo(promoTarget.id, promo)
      showToast('Promoção adicionada!')
      setPromoTarget(null)
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleDeletePromo = async (promoId, productId) => {
    try {
      await onDeletePromo(promoId, productId)
      showToast('Promoção removida.')
    } catch (e) { showToast(e.message, 'error') }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const filtered   = filter === 'all' ? products : products.filter(p => p.category === filter)
  const totalVal   = products.reduce((s, p) => s + (p.pricePerUnit ?? 0) * p.stockQty, 0)
  const totalTons  = products.reduce((s, p) => s + (p.weightKg ?? 0) * p.stockQty / 1000, 0)

  if (!vendor) return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.noVendor}>
        <AlertCircle size={36} style={{color:'var(--amber)'}}/>
        <h3>Perfil não encontrado</h3>
        <p>Complete seu cadastro em <strong>Meu Perfil</strong> para adicionar produtos.</p>
      </div>
    </div>
  )

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Meus Produtos</h1>
          <p className={styles.subtitle}>Catálogo com preços, pesos e promoções por volume</p>
        </div>
        <Button variant="primary" onClick={() => setEditProduct({})}>
          <Plus size={14}/> Cadastrar Produto
        </Button>
      </div>

      {!loading && products.length > 0 && (
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <strong>{products.length}</strong>
            <span>produto{products.length !== 1 ? 's' : ''}</span>
          </div>
          <div className={styles.statDiv}/>
          <div className={styles.stat}>
            <strong>{products.reduce((s,p)=>s+p.stockQty,0)}</strong>
            <span>unidades</span>
          </div>
          {totalTons > 0.1 && (
            <>
              <div className={styles.statDiv}/>
              <div className={styles.stat}>
                <strong>{totalTons.toFixed(1)} t</strong>
                <span>peso total</span>
              </div>
            </>
          )}
          <div className={styles.statDiv}/>
          <div className={styles.stat}>
            <strong style={{color:'var(--primary)'}}>{formatCurrency(totalVal)}</strong>
            <span>valor em estoque</span>
          </div>
          <div className={styles.statDiv}/>
          <div className={styles.stat}>
            <strong>{products.reduce((s,p)=>s+p.promotions.length,0)}</strong>
            <span>promoções</span>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className={styles.filters}>
          {['all', ...categories].map(c => (
            <button key={c}
              className={`${styles.filterChip} ${filter === c ? styles.filterChipOn : ''}`}
              onClick={() => setFilter(c)}>
              {c === 'all' ? 'Todos' : c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}/>
          Carregando produtos…
        </div>
      ) : filtered.length === 0 && products.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><Package size={36}/></div>
          <h3>Nenhum produto ainda</h3>
          <p>Cadastre seus produtos com preço, peso e condições para aparecer nas cotações dos pivôs.</p>
          <Button variant="primary" onClick={() => setEditProduct({})}>
            <Plus size={14}/> Cadastrar primeiro produto
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(p => (
            <ProductCard key={p.id} product={p}
              onEdit={setEditProduct}
              onDelete={handleDelete}
              onAddPromo={setPromoTarget}
              onDeletePromo={handleDeletePromo}
            />
          ))}
        </div>
      )}

      {editProduct !== null && (
        <ProductModal product={editProduct.id ? editProduct : null} onClose={() => setEditProduct(null)} onSave={handleSave}/>
      )}
      {promoTarget && (
        <PromoModal product={promoTarget} onClose={() => setPromoTarget(null)} onSave={handleAddPromo}/>
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onDone={clearToast}/>}
    </div>
  )
}
