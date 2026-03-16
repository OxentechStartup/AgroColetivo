import { useState } from 'react'
import { Plus, Trash2, TrendingUp, Truck, AlertCircle, CheckCircle2, Activity } from 'lucide-react'
import { Button } from './Button'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
import { formatCurrency, maskCurrency, unmaskCurrency } from '../utils/masks'
import { calcSupplyStats } from '../utils/data'
import styles from './LotsPanel.module.css'


// Modal: registrar proposta de fornecedor
function AddLotModal({ unit, onClose, onSave }) {
  const [vendorName, setVendorName] = useState('')
  const [qty,        setQty]        = useState('')
  const [price,      setPrice]      = useState('')
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)

  const priceNum = unmaskCurrency(price) ?? 0
  const canSave  = vendorName.trim() && +qty > 0 && priceNum > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        vendorId:     null,
        vendorName:   vendorName.trim(),
        qtyAvailable: +qty,
        pricePerUnit: priceNum,
        notes:        notes.trim() || null,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHeader title="Registrar proposta de fornecedor" onClose={onClose}/>
      <ModalBody>
        <p style={{fontSize:'.82rem',color:'var(--text2)',marginBottom:16,lineHeight:1.5}}>
          Preencha a proposta recebida do fornecedor via WhatsApp ou telefone.
        </p>
        <div className="form-group">
          <label className="form-label">Nome do fornecedor *</label>
          <input className="form-input" placeholder="Ex: Agropecuaria Central"
            value={vendorName} onChange={e => setVendorName(e.target.value)} autoFocus/>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Qtd disponivel ({unit}) *</label>
            <input type="number" min="1" className="form-input" placeholder="Ex: 500"
              value={qty} onChange={e => setQty(e.target.value)} inputMode="numeric"/>
          </div>
          <div className="form-group">
            <label className="form-label">Preco / {unit?.replace(/s$/, '') ?? 'un'} (R$) *</label>
            <input className="form-input" placeholder="0,00"
              value={price} onChange={e => setPrice(maskCurrency(e.target.value))} inputMode="numeric"/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Observacoes (opcional)</label>
          <input className="form-input" placeholder="Ex: Frete incluso, entrega em 5 dias"
            value={notes} onChange={e => setNotes(e.target.value)}/>
        </div>
        {priceNum > 0 && +qty > 0 && (
          <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'10px 14px',fontSize:'.84rem'}}>
            <span style={{color:'var(--text2)'}}>{vendorName || 'Fornecedor'} - {qty} {unit}</span>
            {' = '}
            <strong style={{color:'var(--primary)'}}>{formatCurrency(priceNum * +qty)}</strong>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? 'Salvando...' : 'Adicionar proposta'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// Modal: frete & markup
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
            {fNum > 0 && <span className="form-hint">-> {formatCurrency(fNum/n)} por comprador</span>}
          </div>
          <div className="form-group">
            <label className="form-label">
              <TrendingUp size={10} style={{marginRight:4,verticalAlign:'middle'}}/>
              Markup / Taxa (R$)
            </label>
            <input className="form-input" placeholder="0,00"
              value={markup} onChange={mask(setMarkup)} inputMode="numeric"/>
            {mNum > 0 && <span className="form-hint">-> {formatCurrency(mNum/n)} por comprador</span>}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// Painel principal
export function LotsPanel({ campaign, vendors, onAddLot, onRemoveLot, onSaveFreight }) {
  const [showAdd,     setShowAdd]     = useState(false)
  const [showFreight, setShowFreight] = useState(false)

  const lots   = campaign.lots   ?? []
  const orders = campaign.orders ?? []
  const unit   = campaign.unit   ?? 'unidades'

  const stats = calcSupplyStats(lots, orders, campaign.freightTotal, campaign.markupTotal, campaign.goalQty)

  return (
    <div className={styles.wrap}>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.sectionTitle}>Propostas de Fornecedores</div>
            <div className={styles.sectionSub}>
              Registre as propostas recebidas em ordem de prioridade. O 1o supra o maximo antes de passar ao proximo.
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={13}/> Adicionar
          </Button>
        </div>

        {(lots.length > 0 || orders.length > 0) && (
          <div className={`${styles.statusRow} ${
            stats.isFulfilled ? styles.statusOk
            : lots.length > 0  ? styles.statusWarn
            : styles.statusNeutral
          }`}>
            {stats.isFulfilled
              ? <><CheckCircle2 size={13}/> Oferta cobre toda a demanda ({stats.totalAvailable} {unit})</>
              : lots.length > 0
                ? <><AlertCircle size={13}/> Faltam {Math.max(0, stats.demandTarget - stats.totalAvailable)} {unit}</>
                : <><AlertCircle size={13}/> Adicione propostas de fornecedores</>
            }
            {stats.avgPrice > 0 && (
              <span className={styles.avgPrice}>
                Preco medio: <strong>{formatCurrency(stats.avgPrice)}/{unit.replace(/s$/,'')}</strong>
              </span>
            )}
          </div>
        )}

        {lots.length === 0
          ? (
            <div className={styles.empty}>
              Apos enviar a cotacao aos fornecedores, registre aqui as propostas recebidas. O sistema calcula o preco medio ponderado automaticamente.
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
                        <span><strong>{lot.qtyAvailable}</strong> {unit} disponiveis</span>
                        <span className={styles.dot}>-</span>
                        <span><strong>{formatCurrency(lot.pricePerUnit)}</strong>/{unit.replace(/s$/,'')}</span>
                        <span className={styles.dot}>-</span>
                        <span style={{color:'var(--primary)'}}>
                          {orders.length > 0 && lot.used > 0
                            ? formatCurrency(lot.used * lot.pricePerUnit)
                            : formatCurrency(lot.qtyAvailable * lot.pricePerUnit)}
                        </span>
                        {orders.length > 0 && (
                          <><span className={styles.dot}>-</span>
                          <span style={{color:'var(--amber)'}}>
                            {lot.used}/{stats.totalOrdered} {unit}
                          </span></>
                        )}
                      </div>
                      {orders.length > 0 && (
                        <div className={styles.lotBar}>
                          <div className={styles.lotBarFill} style={{
                            width: `${usedPct}%`,
                            background: usedPct >= 100 ? 'var(--amber)' : 'var(--primary)',
                          }}/>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {lots.length > 1 && (
                <div className={styles.summary}>
                  <div className={styles.summaryRow}>
                    <span>Total disponivel</span>
                    <span>{stats.totalAvailable} {unit}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Custo total dos lotes</span>
                    <span>{formatCurrency(stats.weightedSum)}</span>
                  </div>
                  <div className={styles.summaryHighlight}>
                    <span>Preco medio ponderado</span>
                    <span>{formatCurrency(stats.avgPrice)}/{unit.replace(/s$/,'')}</span>
                  </div>
                </div>
              )}
            </div>
          )
        }
      </div>

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

        {stats.totalGross > 0 ? (
          <div className={styles.freightRow}>
            <div className={`${styles.freightChip} ${(campaign.freightTotal ?? 0) === 0 ? styles.freightChipEmpty : ''}`}>
              <Truck size={14} style={{color:(campaign.freightTotal??0)>0?'var(--blue)':'var(--text3)',marginTop:2}}/>
              <div>
                <div className={styles.chipLabel}>Frete</div>
                <div className={styles.chipValue} style={{color:(campaign.freightTotal??0)>0?'var(--blue)':'var(--text3)'}}>
                  {(campaign.freightTotal ?? 0) > 0 ? formatCurrency(campaign.freightTotal) : '-'}
                </div>
                {stats.freightEach > 0 && <div className={styles.chipSub}>{formatCurrency(stats.freightEach)}/comprador</div>}
              </div>
            </div>
            <div className={`${styles.freightChip} ${(campaign.markupTotal ?? 0) === 0 ? styles.freightChipEmpty : ''}`}>
              <TrendingUp size={14} style={{color:(campaign.markupTotal??0)>0?'var(--primary)':'var(--text3)',marginTop:2}}/>
              <div>
                <div className={styles.chipLabel}>Markup / Taxa do gestor</div>
                <div className={styles.chipValue} style={{color:(campaign.markupTotal??0)>0?'var(--primary)':'var(--text3)'}}>
                  {(campaign.markupTotal ?? 0) > 0 ? formatCurrency(campaign.markupTotal) : '-'}
                </div>
                {stats.markupEach > 0 && <div className={styles.chipSub}>{formatCurrency(stats.markupEach)}/comprador</div>}
              </div>
            </div>
            <div className={styles.freightChip} style={{borderColor:'var(--amber-border)',background:'var(--amber-dim)'}}>
              <Activity size={14} style={{color:'var(--amber)',marginTop:2}}/>
              <div>
                <div className={styles.chipLabel}>Taxa plataforma (1,5%)</div>
                <div className={styles.chipValue} style={{color:'var(--amber)'}}>{formatCurrency(stats.feeTotal)}</div>
                <div className={styles.chipSub}>{formatCurrency(stats.feeEach)}/comprador</div>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.empty}>
            Nenhum lote com preco definido. Adicione propostas acima.
          </div>
        )}
      </div>

      {orders.length > 0 && lots.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Custo por Produtor</div>
          <div className={styles.calcNote}>
            Produto (preco medio x qtd)
            {(stats.freightEach + stats.markupEach + stats.feeEach) > 0
              ? ` + encargos por produtor: ${formatCurrency(stats.freightEach + stats.markupEach + stats.feeEach)}`
              : ''}
          </div>
          <div className={styles.tableWrap}>
            <table className="tbl">
              <thead><tr>
                <th>Produtor</th><th>Qtd</th><th>Produto</th>
                {(stats.freightEach + stats.markupEach + stats.feeEach) > 0 && <th>Encargos</th>}
                <th>Total</th>
              </tr></thead>
              <tbody>
                {orders.map(o => {
                  const produto = stats.avgPrice * o.qty
                  const extras  = stats.freightEach + stats.markupEach
                  const total   = produto + extras + stats.feeEach
                  return (
                    <tr key={o.orderId}>
                      <td style={{fontWeight:600}}>{o.producerName}</td>
                      <td style={{whiteSpace:'nowrap'}}>{o.qty} {unit}</td>
                      <td>{formatCurrency(produto)}</td>
                      {(extras + stats.feeEach) > 0 && (
                        <td><div style={{fontSize:'.82rem'}}>{formatCurrency(extras + stats.feeEach)}</div></td>
                      )}
                      <td><strong style={{color:'var(--primary)'}}>{formatCurrency(total)}</strong></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.costCards}>
            {orders.map(o => {
              const produto = stats.avgPrice * o.qty
              const extras  = stats.freightEach + stats.markupEach
              const total   = produto + extras + stats.feeEach
              return (
                <div key={o.orderId} className={styles.costCard}>
                  <div className={styles.costCardTop}>
                    <span className={styles.costName}>{o.producerName}</span>
                    <strong className={styles.costTotal}>{formatCurrency(total)}</strong>
                  </div>
                  <div className={styles.costCardRows}>
                    <div className={styles.costRow}>
                      <span>{o.qty} {unit} x {formatCurrency(stats.avgPrice)}</span>
                      <span>{formatCurrency(produto)}</span>
                    </div>
                    {(extras + stats.feeEach) > 0 && (
                      <div className={styles.costRow}>
                        <span>Encargos</span>
                        <span style={{color:'var(--amber)',fontWeight:600}}>{formatCurrency(extras + stats.feeEach)}</span>
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
        <AddLotModal unit={unit}
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
