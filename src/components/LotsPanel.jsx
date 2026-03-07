import { useState } from 'react'
import { Plus, Trash2, TrendingUp, Truck, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from './Button'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
import { formatCurrency, maskCurrency, unmaskCurrency } from '../utils/masks'
import styles from './LotsPanel.module.css'

// ═══════════════════════════════════════════════════════════════════
// CÁLCULO CENTRAL — Preço médio ponderado por prioridade de fornecedor
//
// Como funciona:
//   1. Admin coleta pedidos: João 30 sacos, Maria 40 → total = 70
//   2. Admin cadastra fornecedores em ordem de prioridade:
//      F1: 50 disponíveis × R$85,00
//      F2: 50 disponíveis × R$90,00
//   3. Sistema distribui do primeiro pro próximo:
//      F1 usa: min(50, 70) = 50  →  restam 20
//      F2 usa: min(50, 20) = 20  →  restam 0
//   4. Custo ponderado: (50×85 + 20×90) ÷ 70 = R$86,43/saco
//   5. João paga: 30 × R$86,43 = R$2.592,90 + extras
//      Maria paga: 40 × R$86,43 = R$3.457,20 + extras
//      Extras (frete + markup) = valor total ÷ nº de compradores
// ═══════════════════════════════════════════════════════════════════
export function calcSupplyStats(lots, orders, freightTotal, markupTotal) {
  const totalOrdered   = orders.reduce((s, o) => s + o.qty, 0)
  const totalAvailable = lots.reduce((s, l) => s + l.qtyAvailable, 0)
  const numBuyers      = orders.length

  // distribui por prioridade (ordem do array)
  let remaining   = totalOrdered
  let weightedSum = 0
  const lotBreakdown = lots.map(lot => {
    const used  = Math.min(lot.qtyAvailable, Math.max(0, remaining))
    remaining  -= used
    weightedSum += used * lot.pricePerUnit
    return { ...lot, used }
  })

  const totalSupplied = totalOrdered - remaining
  // preço médio = soma(qtdUsada_i × preço_i) ÷ totalSuprido
  const avgPrice = totalSupplied > 0 ? weightedSum / totalSupplied : 0

  // extras divididos igualmente entre compradores
  const freightEach = numBuyers > 0 ? (freightTotal ?? 0) / numBuyers : 0
  const markupEach  = numBuyers > 0 ? (markupTotal  ?? 0) / numBuyers : 0

  const isFulfilled = totalAvailable >= totalOrdered && totalOrdered > 0

  return {
    totalAvailable, totalOrdered, totalSupplied,
    numBuyers, avgPrice, freightEach, markupEach,
    isFulfilled, lotBreakdown, weightedSum,
  }
}

// ── Modal: adicionar fornecedor ──────────────────────────────────────
function AddLotModal({ vendors, unit, onClose, onSave }) {
  const [vendorId,   setVendorId]   = useState('')
  const [vendorName, setVendorName] = useState('')
  const [qty,        setQty]        = useState('')
  const [price,      setPrice]      = useState('')
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)

  const mask     = setter => e => setter(maskCurrency(e.target.value))
  const selV     = vendors.find(v => v.id === vendorId)
  const label    = selV?.name || vendorName || 'Fornecedor'
  const priceNum = unmaskCurrency(price) ?? 0
  const canSave  = (vendorId || vendorName.trim()) && +qty > 0 && priceNum > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        vendorId:     vendorId || null,
        vendorName:   vendorId ? null : vendorName.trim(),
        qtyAvailable: +qty,
        pricePerUnit: priceNum,
        freight: 0, markup: 0,
        notes: notes.trim() || null,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Adicionar Fornecedor" onClose={onClose}/>
      <ModalBody>
        <div className="form-group">
          <label className="form-label">Fornecedor</label>
          {vendors.length > 0 && (
            <select className="form-select" value={vendorId}
              onChange={e => { setVendorId(e.target.value); setVendorName('') }}>
              <option value="">— Digitar manualmente —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          {!vendorId && (
            <input className="form-input" style={{marginTop: vendors.length ? 8 : 0}}
              placeholder="Nome do fornecedor" value={vendorName}
              onChange={e => setVendorName(e.target.value)} autoFocus={!vendors.length}/>
          )}
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Qtd disponível ({unit})</label>
            <input type="number" min="1" className="form-input" placeholder="100"
              value={qty} onChange={e => setQty(e.target.value)} inputMode="numeric"/>
          </div>
          <div className="form-group">
            <label className="form-label">Preço / {unit?.replace(/s$/,'') ?? 'un'} (R$)</label>
            <input className="form-input" placeholder="0,00"
              value={price} onChange={mask(setPrice)} inputMode="numeric"/>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Observações (opcional)</label>
          <input className="form-input" placeholder="Ex: Entrega em 5 dias"
            value={notes} onChange={e => setNotes(e.target.value)}/>
        </div>

        {priceNum > 0 && +qty > 0 && (
          <div className={styles.preview}>
            <span>{label} · {qty} {unit}</span>
            <strong style={{color:'var(--green)'}}>{formatCurrency(priceNum * +qty)}</strong>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? 'Salvando…' : 'Adicionar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Modal: frete & markup ────────────────────────────────────────────
function FreightMarkupModal({ campaign, onClose, onSave }) {
  const toMask = v => (v > 0 ? Number(v).toFixed(2).replace('.', ',') : '')
  const [freight, setFreight] = useState(toMask(campaign.freightTotal ?? 0))
  const [markup,  setMarkup]  = useState(toMask(campaign.markupTotal  ?? 0))
  const [saving,  setSaving]  = useState(false)

  const mask = setter => e => setter(maskCurrency(e.target.value))
  const fNum = unmaskCurrency(freight) ?? 0
  const mNum = unmaskCurrency(markup)  ?? 0
  const n    = campaign.orders?.length || 1

  const handleSave = async () => {
    setSaving(true)
    try { await onSave({ freight: fNum, markup: mNum }); onClose() }
    finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Frete & Markup" onClose={onClose}/>
      <ModalBody>
        <div className={styles.freightHint}>
          Valores divididos igualmente entre os <strong>{n} comprador{n!==1?'es':''}</strong>.
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              <Truck size={10} style={{marginRight:4,verticalAlign:'middle'}}/>
              Frete total (R$)
            </label>
            <input className="form-input" placeholder="0,00"
              value={freight} onChange={mask(setFreight)} inputMode="numeric"/>
            {fNum > 0 && <span className="form-hint">→ {formatCurrency(fNum/n)} por comprador</span>}
          </div>
          <div className="form-group">
            <label className="form-label">
              <TrendingUp size={10} style={{marginRight:4,verticalAlign:'middle'}}/>
              Markup / Taxa (R$)
            </label>
            <input className="form-input" placeholder="0,00"
              value={markup} onChange={mask(setMarkup)} inputMode="numeric"/>
            {mNum > 0 && <span className="form-hint">→ {formatCurrency(mNum/n)} por comprador</span>}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Painel principal ─────────────────────────────────────────────────
export function LotsPanel({ campaign, vendors, onAddLot, onRemoveLot, onSaveFreight }) {
  const [showAdd,     setShowAdd]     = useState(false)
  const [showFreight, setShowFreight] = useState(false)

  const lots   = campaign.lots   ?? []
  const orders = campaign.orders ?? []
  const unit   = campaign.unit   ?? 'unidades'

  const stats = calcSupplyStats(lots, orders, campaign.freightTotal, campaign.markupTotal)

  return (
    <div className={styles.wrap}>

      {/* ── SEÇÃO 1: Fornecedores ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.sectionTitle}>Fornecedores</div>
            <div className={styles.sectionSub}>
              Adicione em ordem de prioridade. O 1º supre o máximo disponível antes de passar ao próximo.
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={13}/> Adicionar
          </Button>
        </div>

        {/* Status de cobertura */}
        {(lots.length > 0 || orders.length > 0) && (
          <div className={`${styles.statusRow} ${
            stats.isFulfilled ? styles.statusOk
            : lots.length > 0  ? styles.statusWarn
            : styles.statusNeutral
          }`}>
            {stats.isFulfilled
              ? <><CheckCircle2 size={13}/> Oferta cobre toda a demanda ({stats.totalAvailable} {unit})</>
              : lots.length > 0
                ? <><AlertCircle size={13}/> Faltam {Math.max(0, stats.totalOrdered - stats.totalAvailable)} {unit}</>
                : <><AlertCircle size={13}/> Adicione fornecedores</>
            }
            {stats.avgPrice > 0 && (
              <span className={styles.avgPrice}>
                Preço médio: <strong>{formatCurrency(stats.avgPrice)}/{unit.replace(/s$/,'')}</strong>
              </span>
            )}
          </div>
        )}

        {lots.length === 0
          ? (
            <div className={styles.empty}>
              Adicione os fornecedores em ordem de prioridade. O sistema calcula automaticamente o preço médio ponderado da compra.
            </div>
          ) : (
            <div className={styles.lotsList}>
              {stats.lotBreakdown.map((lot, idx) => {
                const usedPct = lot.qtyAvailable > 0 ? Math.round((lot.used / lot.qtyAvailable) * 100) : 0
                return (
                  <div key={lot.id} className={styles.lot}>
                    <div className={styles.lotNum}>{idx + 1}</div>
                    <div className={styles.lotContent}>
                      <div className={styles.lotHeader}>
                        <span className={styles.lotName}>{lot.vendorName}</span>
                        <div className={styles.lotActions}>
                          {lot.notes && <span className={styles.lotNote} title={lot.notes}>{lot.notes}</span>}
                          <button className={styles.delBtn}
                            onClick={() => onRemoveLot(campaign.id, lot.id)}
                            title="Remover fornecedor">
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </div>

                      <div className={styles.lotMeta}>
                        <span><strong>{lot.qtyAvailable}</strong> {unit} disponíveis</span>
                        <span className={styles.dot}>·</span>
                        <span><strong>{formatCurrency(lot.pricePerUnit)}</strong>/{unit.replace(/s$/,'')}</span>
                        <span className={styles.dot}>·</span>
                        {/* subtotal = apenas o que foi efetivamente usado × preço */}
                        <span style={{color:'var(--green)'}}>
                          {orders.length > 0 && lot.used > 0
                            ? formatCurrency(lot.used * lot.pricePerUnit)
                            : formatCurrency(lot.qtyAvailable * lot.pricePerUnit)}
                        </span>
                        {orders.length > 0 && (
                          <><span className={styles.dot}>·</span>
                          {/* X/total = quantos deste lote / total pedido */}
                          <span style={{color:'var(--amber)'}}>
                            {lot.used}/{stats.totalOrdered} {unit}
                          </span></>
                        )}
                      </div>

                      {orders.length > 0 && (
                        <div className={styles.lotBar}>
                          <div className={styles.lotBarFill} style={{
                            width: `${usedPct}%`,
                            background: usedPct >= 100 ? 'var(--amber)' : 'var(--green)',
                          }}/>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Resumo quando mais de 1 fornecedor */}
              {lots.length > 1 && (
                <div className={styles.summary}>
                  <div className={styles.summaryRow}>
                    <span>Total disponível</span>
                    <span>{stats.totalAvailable} {unit}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Custo total dos lotes</span>
                    <span>{formatCurrency(stats.weightedSum)}</span>
                  </div>
                  <div className={styles.summaryHighlight}>
                    <span>Preço médio ponderado</span>
                    <span>{formatCurrency(stats.avgPrice)}/{unit.replace(/s$/,'')}</span>
                  </div>
                </div>
              )}
            </div>
          )
        }
      </div>

      {/* ── SEÇÃO 2: Frete & Markup ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.sectionTitle}>Frete & Markup</div>
            <div className={styles.sectionSub}>Divididos igualmente entre todos os compradores</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowFreight(true)}>
            {(campaign.freightTotal ?? 0) > 0 || (campaign.markupTotal ?? 0) > 0 ? 'Editar' : 'Definir'}
          </Button>
        </div>

        {(campaign.freightTotal ?? 0) > 0 || (campaign.markupTotal ?? 0) > 0 ? (
          <div className={styles.freightRow}>
            {(campaign.freightTotal ?? 0) > 0 && (
              <div className={styles.freightChip}>
                <Truck size={14} style={{color:'var(--text3)',marginTop:2}}/>
                <div>
                  <div className={styles.chipLabel}>Frete total</div>
                  <div className={styles.chipValue}>{formatCurrency(campaign.freightTotal)}</div>
                  <div className={styles.chipSub}>{formatCurrency(stats.freightEach)} por comprador</div>
                </div>
              </div>
            )}
            {(campaign.markupTotal ?? 0) > 0 && (
              <div className={styles.freightChip}>
                <TrendingUp size={14} style={{color:'var(--text3)',marginTop:2}}/>
                <div>
                  <div className={styles.chipLabel}>Markup / Taxa</div>
                  <div className={styles.chipValue}>{formatCurrency(campaign.markupTotal)}</div>
                  <div className={styles.chipSub}>{formatCurrency(stats.markupEach)} por comprador</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.empty}>
            Nenhum frete ou markup definido. Clique em "Definir" para inserir.
          </div>
        )}
      </div>

      {/* ── SEÇÃO 3: Custo por produtor ── */}
      {orders.length > 0 && lots.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Custo por Produtor</div>

          <div className={styles.calcNote}>
            {formatCurrency(stats.avgPrice)}/{unit.replace(/s$/,'')} (preço médio) × qtd de cada produtor
            {(stats.freightEach + stats.markupEach) > 0
              ? ` + ${formatCurrency(stats.freightEach + stats.markupEach)} de extras por pessoa`
              : ''}
          </div>

          {/* Desktop: tabela */}
          <div className={styles.tableWrap}>
            <table className="tbl">
              <thead><tr>
                <th>Produtor</th>
                <th>Qtd</th>
                <th>Produto</th>
                {(stats.freightEach + stats.markupEach) > 0 && <th>Extras</th>}
                <th>Total</th>
              </tr></thead>
              <tbody>
                {orders.map(o => {
                  const produto = stats.avgPrice * o.qty
                  const extras  = stats.freightEach + stats.markupEach
                  const total   = produto + extras
                  return (
                    <tr key={o.orderId}>
                      <td style={{fontWeight:600}}>{o.producerName}</td>
                      <td style={{whiteSpace:'nowrap'}}>{o.qty} {unit}</td>
                      <td>{formatCurrency(produto)}</td>
                      {extras > 0 && <td style={{color:'var(--text2)'}}>{formatCurrency(extras)}</td>}
                      <td><strong style={{color:'var(--green)'}}>{formatCurrency(total)}</strong></td>
                    </tr>
                  )
                })}
              </tbody>
              {orders.length > 1 && (
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total geral</td>
                    <td>{formatCurrency(stats.avgPrice * stats.totalOrdered)}</td>
                    {(stats.freightEach + stats.markupEach) > 0 && (
                      <td>{formatCurrency((stats.freightEach + stats.markupEach) * stats.numBuyers)}</td>
                    )}
                    <td style={{color:'var(--green)'}}>
                      {formatCurrency(
                        stats.avgPrice * stats.totalOrdered +
                        (campaign.freightTotal ?? 0) +
                        (campaign.markupTotal  ?? 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile: cards */}
          <div className={styles.costCards}>
            {orders.map(o => {
              const produto = stats.avgPrice * o.qty
              const extras  = stats.freightEach + stats.markupEach
              const total   = produto + extras
              return (
                <div key={o.orderId} className={styles.costCard}>
                  <div className={styles.costCardTop}>
                    <span className={styles.costName}>{o.producerName}</span>
                    <strong className={styles.costTotal}>{formatCurrency(total)}</strong>
                  </div>
                  <div className={styles.costCardRows}>
                    <div className={styles.costRow}>
                      <span>{o.qty} {unit} × {formatCurrency(stats.avgPrice)}</span>
                      <span>{formatCurrency(produto)}</span>
                    </div>
                    {extras > 0 && (
                      <div className={styles.costRow}>
                        <span>Frete + Markup</span>
                        <span style={{color:'var(--text2)'}}>{formatCurrency(extras)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAdd && (
        <AddLotModal vendors={vendors} unit={unit}
          onClose={() => setShowAdd(false)}
          onSave={lot => onAddLot(campaign.id, lot)}/>
      )}
      {showFreight && (
        <FreightMarkupModal campaign={campaign}
          onClose={() => setShowFreight(false)}
          onSave={vals => onSaveFreight(campaign.id, vals)}/>
      )}
    </div>
  )
}
