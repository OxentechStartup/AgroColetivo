import { useState, useEffect } from 'react'
import {
  DollarSign, Truck, TrendingUp, Activity, CheckCircle2, AlertCircle,
  Plus, Trash2, ChevronLeft, MessageCircle, Copy, Check,
  Package, Users, BarChart3, ArrowRight,
} from 'lucide-react'
import { Button }             from '../components/Button'
import { Badge }              from '../components/Badge'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal'
import { Toast }              from '../components/Toast'
import { useToast }           from '../hooks/useToast'
import { calcSupplyStats, STATUS_LABEL } from '../utils/data'
import { formatCurrency, maskCurrency, unmaskCurrency, displayPhone } from '../utils/masks'
import styles from './FinancialPage.module.css'

// ── Modal: adicionar lote manual ─────────────────────────────────────────────
function AddLotModal({ unit, onClose, onSave }) {
  const [vendorName, setVendorName] = useState('')
  const [qty,        setQty]        = useState('')
  const [price,      setPrice]      = useState('')
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)

  const priceNum = unmaskCurrency(price) ?? 0
  const canSave  = vendorName.trim() && +qty > 0 && priceNum > 0

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHeader title="Registrar proposta manual" onClose={onClose}/>
      <ModalBody>
        <p style={{fontSize:'.82rem',color:'var(--text2)',marginBottom:16,lineHeight:1.5}}>
          Preencha a proposta recebida via WhatsApp ou telefone.
        </p>
        <div className="form-group">
          <label className="form-label">Nome do fornecedor *</label>
          <input className="form-input" placeholder="Ex: Agropecuária Central"
            value={vendorName} onChange={e => setVendorName(e.target.value)} autoFocus/>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Qtd disponível ({unit}) *</label>
            <input type="number" min="1" className="form-input" placeholder="Ex: 500"
              value={qty} onChange={e => setQty(e.target.value)} inputMode="numeric"/>
          </div>
          <div className="form-group">
            <label className="form-label">Preço / {unit?.replace(/s$/, '') ?? 'un'} *</label>
            <input className="form-input" placeholder="0,00"
              value={price} onChange={e => setPrice(maskCurrency(e.target.value))} inputMode="numeric"/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Observações</label>
          <input className="form-input" placeholder="Ex: Frete incluso, entrega em 5 dias"
            value={notes} onChange={e => setNotes(e.target.value)}/>
        </div>
        {priceNum > 0 && +qty > 0 && (
          <div style={{background:'var(--primary-dim)',border:'1px solid var(--primary-border)',borderRadius:'var(--r)',padding:'10px 14px',fontSize:'.84rem'}}>
            <span style={{color:'var(--text2)'}}>{vendorName || 'Fornecedor'}: {qty} {unit}</span>
            {' = '}<strong style={{color:'var(--primary)'}}>{formatCurrency(priceNum * +qty)}</strong>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!canSave || saving} onClick={async () => {
          setSaving(true)
          try {
            await onSave({ vendorId: null, vendorName: vendorName.trim(), qtyAvailable: +qty, pricePerUnit: priceNum, notes: notes.trim() || null })
            onClose()
          } finally { setSaving(false) }
        }}>
          {saving ? 'Salvando...' : 'Adicionar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Modal: frete & taxa ───────────────────────────────────────────────────────
function FreightModal({ campaign, onClose, onSave }) {
  const toMask = v => (v > 0 ? Number(v).toFixed(2).replace('.', ',') : '')
  const [freight, setFreight] = useState(toMask(campaign.freightTotal ?? 0))
  const [markup,  setMarkup]  = useState(toMask(campaign.markupTotal  ?? 0))
  const [saving,  setSaving]  = useState(false)
  const mask = setter => e => setter(maskCurrency(e.target.value))
  const fNum = unmaskCurrency(freight) ?? 0
  const mNum = unmaskCurrency(markup)  ?? 0
  const n    = campaign.orders?.length || 1

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Frete & Taxa do Gestor" onClose={onClose}/>
      <ModalBody>
        <div style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'10px 14px',fontSize:'.82rem',color:'var(--text2)',marginBottom:16}}>
          Dividido igualmente entre os <strong style={{color:'var(--text)'}}>{n} comprador{n!==1?'es':''}</strong>.
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label"><Truck size={11} style={{marginRight:4,verticalAlign:'middle'}}/> Frete total (R$)</label>
            <input className="form-input" placeholder="0,00" value={freight} onChange={mask(setFreight)} inputMode="numeric"/>
            {fNum > 0 && <span className="form-hint">→ {formatCurrency(fNum/n)}/comprador</span>}
          </div>
          <div className="form-group">
            <label className="form-label"><TrendingUp size={11} style={{marginRight:4,verticalAlign:'middle'}}/> Taxa do gestor (R$)</label>
            <input className="form-input" placeholder="0,00" value={markup} onChange={mask(setMarkup)} inputMode="numeric"/>
            {mNum > 0 && <span className="form-hint">→ {formatCurrency(mNum/n)}/comprador</span>}
          </div>
        </div>
        {(fNum + mNum) > 0 && (
          <div style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'10px 14px',fontSize:'.84rem',display:'flex',justifyContent:'space-between'}}>
            <span style={{color:'var(--text2)'}}>Total de encargos</span>
            <strong>{formatCurrency(fNum + mNum)}</strong>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={saving} onClick={async () => {
          setSaving(true)
          try { await onSave({ freight: fNum, markup: mNum }); onClose() }
          finally { setSaving(false) }
        }}>{saving ? 'Salvando...' : 'Salvar'}</Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Etapa 1: Fornecedor ───────────────────────────────────────────────────────
function StepLots({ campaign, stats, onAdd, onRemove, onDone }) {
  const [showAdd, setShowAdd] = useState(false)
  const lots = campaign.lots ?? []
  const unit = campaign.unit ?? 'un'
  const totalOrdered = campaign.orders?.reduce((s,o) => s+o.qty, 0) ?? 0
  const done = lots.length > 0 && stats.avgPrice > 0

  return (
    <div className={`${styles.step} ${done ? styles.stepDone : styles.stepActive}`}>
      <div className={styles.stepHead}>
        <div className={styles.stepNum}>{done ? '✓' : '1'}</div>
        <div className={styles.stepInfo}>
          <div className={styles.stepTitle}><Package size={14}/> Fornecedor escolhido</div>
          <div className={styles.stepDesc}>Proposta aceita que vai abastecer a demanda</div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={13}/> Adicionar manual
          </Button>
          {done && (
            <Button variant="primary" size="sm" onClick={onDone}>
              Próximo <ArrowRight size={13}/>
            </Button>
          )}
        </div>
      </div>

      {/* Cobertura */}
      {(lots.length > 0 || totalOrdered > 0) && (
        <div className={`${styles.coverageBar} ${stats.isFulfilled ? styles.coverageOk : lots.length > 0 ? styles.coverageWarn : styles.coverageNeutral}`}>
          {stats.isFulfilled
            ? <><CheckCircle2 size={14}/> Demanda coberta — {stats.totalAvailable} {unit} disponíveis</>
            : lots.length > 0
              ? <><AlertCircle size={14}/> Faltam {Math.max(0,(campaign.orders?.reduce((s,o)=>s+o.qty,0)??0) - stats.totalAvailable)} {unit}</>
              : <><AlertCircle size={14}/> Nenhuma proposta ainda</>
          }
          {stats.avgPrice > 0 && (
            <span style={{marginLeft:'auto',fontWeight:600}}>
              Preço médio: <strong style={{color:'var(--primary)'}}>{formatCurrency(stats.avgPrice)}/{unit.replace(/s$/,'')}</strong>
            </span>
          )}
        </div>
      )}

      {lots.length === 0 ? (
        <div className={styles.emptyStep}>
          <Package size={26} style={{opacity:.2,display:'block',margin:'0 auto 8px'}}/>
          <p>Nenhuma proposta registrada.</p>
          <p style={{fontSize:'.76rem',marginTop:4,color:'var(--text3)'}}>
            Aceite uma proposta na aba "Propostas" da cotação, ou adicione manualmente acima.
          </p>
        </div>
      ) : (
        <div className={styles.lotsGrid}>
          {stats.lotBreakdown.map((lot, idx) => {
            const usedPct = lot.qtyAvailable > 0 ? Math.round((lot.used / lot.qtyAvailable) * 100) : 0
            return (
              <div key={lot.id} className={`${styles.lotCard} ${idx === 0 ? styles.lotCardPrimary : ''}`}>
                <div className={styles.lotCardHead}>
                  <div>
                    {idx === 0 && <div className={styles.lotBadge}>★ Principal</div>}
                    <div className={styles.lotCardName}>{lot.vendorName}</div>
                    {lot.notes && <div className={styles.lotCardNote}>{lot.notes}</div>}
                  </div>
                  <button className={styles.delBtn} onClick={() => onRemove(campaign.id, lot.id)}><Trash2 size={13}/></button>
                </div>
                <div className={styles.lotStats}>
                  <div><span className={styles.lotLabel}>Qtd</span><span className={styles.lotVal}>{lot.qtyAvailable} {unit}</span></div>
                  <div><span className={styles.lotLabel}>Preço/{unit.replace(/s$/,'')}</span><span className={styles.lotVal} style={{color:'var(--primary)'}}>{formatCurrency(lot.pricePerUnit)}</span></div>
                  <div><span className={styles.lotLabel}>Subtotal</span><span className={styles.lotVal} style={{fontWeight:700}}>{formatCurrency(lot.qtyAvailable * lot.pricePerUnit)}</span></div>
                  {totalOrdered > 0 && <div><span className={styles.lotLabel}>Uso</span><span className={styles.lotVal}>{lot.used}/{totalOrdered} {unit}</span></div>}
                </div>
                {totalOrdered > 0 && (
                  <div className={styles.lotBar}><div className={styles.lotBarFill} style={{width:`${usedPct}%`,background: usedPct>=100?'var(--amber)':'var(--primary)'}}/></div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddLotModal unit={unit} onClose={() => setShowAdd(false)}
          onSave={lot => onAdd(campaign.id, lot)}/>
      )}
    </div>
  )
}

// ── Etapa 2: Frete & Taxa ─────────────────────────────────────────────────────
function StepFreight({ campaign, stats, onSave, onDone }) {
  const [showModal, setShowModal] = useState(false)
  const hasFreight = (campaign.freightTotal ?? 0) > 0 || (campaign.markupTotal ?? 0) > 0
  const done = true // sempre pode avançar (frete é opcional)
  const n = campaign.orders?.length || 1

  return (
    <div className={`${styles.step} ${hasFreight ? styles.stepDone : styles.stepActive}`}>
      <div className={styles.stepHead}>
        <div className={styles.stepNum}>{hasFreight ? '✓' : '2'}</div>
        <div className={styles.stepInfo}>
          <div className={styles.stepTitle}><Truck size={14}/> Frete & Taxa do gestor</div>
          <div className={styles.stepDesc}>Divididos igualmente entre os compradores</div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <Button variant={hasFreight ? 'outline' : 'secondary'} size="sm" onClick={() => setShowModal(true)}>
            <Truck size={13}/> {hasFreight ? 'Editar' : 'Definir frete'}
          </Button>
          <Button variant="primary" size="sm" onClick={onDone}>
            {hasFreight ? 'Próximo' : 'Pular'} <ArrowRight size={13}/>
          </Button>
        </div>
      </div>

      {hasFreight ? (
        <div className={styles.freightGrid}>
          <div className={styles.freightItem}>
            <span className={styles.freightLabel}><Truck size={11}/> Frete total</span>
            <span className={styles.freightVal}>{formatCurrency(campaign.freightTotal ?? 0)}</span>
            <span className={styles.freightSub}>{formatCurrency((campaign.freightTotal??0)/n)}/comprador</span>
          </div>
          <div className={styles.freightItem}>
            <span className={styles.freightLabel}><TrendingUp size={11}/> Taxa do gestor</span>
            <span className={styles.freightVal}>{formatCurrency(campaign.markupTotal ?? 0)}</span>
            <span className={styles.freightSub}>{formatCurrency((campaign.markupTotal??0)/n)}/comprador</span>
          </div>
          <div className={styles.freightItem} style={{background:'var(--surface3)'}}>
            <span className={styles.freightLabel}>Total encargos</span>
            <span className={styles.freightVal} style={{color:'var(--text)'}}>{formatCurrency((campaign.freightTotal??0)+(campaign.markupTotal??0))}</span>
            <span className={styles.freightSub}>{formatCurrency(((campaign.freightTotal??0)+(campaign.markupTotal??0))/n)}/comprador</span>
          </div>
        </div>
      ) : (
        <div className={styles.emptyStep}>
          <p style={{color:'var(--text3)',fontSize:'.84rem'}}>Nenhum frete ou taxa definido ainda. Clique em "Definir frete" ou avance sem.</p>
        </div>
      )}

      {showModal && (
        <FreightModal campaign={campaign} onClose={() => setShowModal(false)} onSave={onSave}/>
      )}
    </div>
  )
}

// ── Etapa 3: Custo por comprador ──────────────────────────────────────────────
function StepBuyers({ campaign, stats }) {
  const [copied, setCopied] = useState(null)
  const orders = campaign.orders ?? []
  const unit   = campaign.unit   ?? 'un'
  const encargosEach = stats.freightEach + stats.markupEach + stats.feeEach

  const buildMsg = (o, forUrl = false) => {
    const produto = stats.avgPrice * o.qty
    const total   = produto + encargosEach
    const nl = forUrl ? '%0A' : '\n'
    return (
      `*AgroColetivo - ${campaign.product}*${nl}` +
      `Olá, ${o.producerName}! Resumo da sua compra:${nl}${nl}` +
      `• ${o.qty} ${unit} × ${formatCurrency(stats.avgPrice)} = ${formatCurrency(produto)}${nl}` +
      (encargosEach > 0 ? `• Frete + taxas: ${formatCurrency(encargosEach)}${nl}` : '') +
      `${nl}*Total: ${formatCurrency(total)}* 🌾`
    )
  }

  const copyMsg = (o) => {
    navigator.clipboard.writeText(buildMsg(o)).then(() => {
      setCopied(o.orderId); setTimeout(() => setCopied(null), 2000)
    })
  }

  const sendWa = (o) => {
    const phone = o.phone?.replace(/\D/g, '')
    window.open(`https://wa.me/${phone ? '55'+phone : ''}?text=${buildMsg(o, true)}`, '_blank')
  }

  const isReady = orders.length > 0 && stats.avgPrice > 0

  return (
    <div className={`${styles.step} ${isReady ? styles.stepActive : styles.stepLocked}`}>
      <div className={styles.stepHead}>
        <div className={styles.stepNum}>3</div>
        <div className={styles.stepInfo}>
          <div className={styles.stepTitle}><Users size={14}/> Custo por Comprador</div>
          <div className={styles.stepDesc}>
            {isReady
              ? `Produto (${formatCurrency(stats.avgPrice)}/${unit.replace(/s$/,'')}) × qtd${encargosEach > 0 ? ` + encargos (${formatCurrency(encargosEach)}/comprador)` : ''}`
              : 'Disponível após definir o fornecedor'}
          </div>
        </div>
      </div>

      {!isReady ? (
        <div className={styles.emptyStep}>
          <p style={{color:'var(--text3)',fontSize:'.84rem'}}>Complete a etapa 1 para ver o custo de cada comprador.</p>
        </div>
      ) : (
        <>
          {/* Tabela desktop */}
          <div className={styles.tableWrap}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Comprador</th><th>Qtd</th><th>Produto</th>
                  {encargosEach > 0 && <th>Frete+Taxas</th>}
                  <th>Total</th><th style={{width:90}}>Notificar</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const produto = stats.avgPrice * o.qty
                  const total   = produto + encargosEach
                  return (
                    <tr key={o.orderId}>
                      <td>
                        <div style={{fontWeight:700}}>{o.producerName}</div>
                        {o.phone && <div style={{fontSize:'.7rem',color:'var(--text3)',marginTop:2}}>{displayPhone(o.phone)}</div>}
                      </td>
                      <td style={{whiteSpace:'nowrap'}}>{o.qty} {unit}</td>
                      <td>{formatCurrency(produto)}</td>
                      {encargosEach > 0 && <td style={{color:'var(--amber)'}}>{formatCurrency(encargosEach)}</td>}
                      <td><strong style={{color:'var(--primary)',fontSize:'1rem'}}>{formatCurrency(total)}</strong></td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className={styles.notifyBtn} onClick={() => sendWa(o)} title="WhatsApp"><MessageCircle size={13}/></button>
                          <button className={styles.notifyBtn} onClick={() => copyMsg(o)} title="Copiar"
                            style={{color: copied===o.orderId?'var(--primary)':undefined}}>
                            {copied===o.orderId ? <Check size={13}/> : <Copy size={13}/>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className={styles.buyerCards}>
            {orders.map(o => {
              const produto = stats.avgPrice * o.qty
              const total   = produto + encargosEach
              return (
                <div key={o.orderId} className={styles.buyerCard}>
                  <div className={styles.buyerCardHead}>
                    <div>
                      <div className={styles.buyerName}>{o.producerName}</div>
                      {o.phone && <div style={{fontSize:'.72rem',color:'var(--text3)',marginTop:1}}>{displayPhone(o.phone)}</div>}
                    </div>
                    <strong className={styles.buyerTotal}>{formatCurrency(total)}</strong>
                  </div>
                  <div className={styles.buyerRows}>
                    <div className={styles.buyerRow}><span>{o.qty} {unit} × {formatCurrency(stats.avgPrice)}</span><span>{formatCurrency(produto)}</span></div>
                    {encargosEach > 0 && <div className={styles.buyerRow}><span>Frete + taxas</span><span style={{color:'var(--amber)',fontWeight:600}}>{formatCurrency(encargosEach)}</span></div>}
                  </div>
                  <div className={styles.buyerActions}>
                    <button className={styles.waBtnFull} onClick={() => sendWa(o)}><MessageCircle size={13}/> Enviar WhatsApp</button>
                    <button className={styles.copyBtnSmall} onClick={() => copyMsg(o)}>{copied===o.orderId?<Check size={13}/>:<Copy size={13}/>}</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Total geral */}
          {stats.totalGross > 0 && (
            <div className={styles.grandTotal}>
              <div>
                <div style={{fontSize:'.72rem',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:2}}>Total geral da cotação</div>
                {stats.feeTotal > 0 && (
                  <div style={{fontSize:'.78rem',color:'var(--amber)'}}>
                    <Activity size={11} style={{marginRight:3,verticalAlign:'middle'}}/>
                    Taxa plataforma (1,5%): {formatCurrency(stats.feeTotal)}
                  </div>
                )}
              </div>
              <strong style={{fontSize:'1.25rem',color:'var(--primary)'}}>{formatCurrency(stats.totalGross)}</strong>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Resumo compacto no topo ───────────────────────────────────────────────────
function SummaryBar({ campaign, stats }) {
  const totalOrdered = campaign.orders?.reduce((s,o) => s+o.qty, 0) ?? 0
  const unit = campaign.unit ?? 'un'
  const items = [
    { label: 'Pedido total', value: `${totalOrdered} ${unit}`, icon: Package },
    { label: 'Preço médio',  value: stats.avgPrice > 0 ? formatCurrency(stats.avgPrice) : '—', icon: BarChart3, accent: stats.avgPrice > 0 },
    { label: 'Frete total',  value: (campaign.freightTotal??0) > 0 ? formatCurrency(campaign.freightTotal) : '—', icon: Truck },
    { label: 'Taxa gestor',    value: (campaign.markupTotal??0) > 0 ? formatCurrency(campaign.markupTotal) : '—', icon: TrendingUp },
    { label: 'Total geral',  value: stats.totalGross > 0 ? formatCurrency(stats.totalGross) : '—', icon: DollarSign, primary: true },
  ]
  return (
    <div className={styles.summaryBar}>
      {items.map(({ label, value, icon: Icon, accent, primary }) => (
        <div key={label} className={`${styles.summaryItem} ${primary ? styles.summaryPrimary : ''}`}>
          <Icon size={12}/>
          <span className={styles.summaryLabel}>{label}</span>
          <span className={styles.summaryValue} style={accent ? {color:'var(--primary)'} : undefined}>{value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export function FinancialPage({ campaigns, actions, onBack }) {
  const { addLot, removeLot, saveFinancials, reloadCampaign } = actions
  const { toast, showToast, clearToast } = useToast()
  const [step, setStep] = useState(1)

  const financialCampaigns = campaigns.filter(
    c => c.status === 'closed' || c.status === 'negotiating' || (c.lots?.length ?? 0) > 0
  )
  const [activeCampaignId, setActiveCampaignId] = useState(
    () => financialCampaigns[0]?.id ?? null
  )

  useEffect(() => {
    if (!activeCampaignId && financialCampaigns.length > 0) {
      setActiveCampaignId(financialCampaigns[0].id)
    }
  }, [campaigns]) // eslint-disable-line

  // Quando muda de campanha, volta ao step 1
  const handleSelectCampaign = (id) => {
    setActiveCampaignId(id)
    setStep(1)
  }

  const active = campaigns.find(c => c.id === activeCampaignId) ?? null
  const lots   = active?.lots   ?? []
  const orders = active?.orders ?? []
  const stats  = calcSupplyStats(lots, orders, active?.freightTotal, active?.markupTotal, active?.goalQty)

  const runLot = (fn, msg) => async (...args) => {
    try { await fn(...args); if (msg) showToast(msg); if (active) await reloadCampaign(active.id) }
    catch (e) { showToast(e.message, 'error') }
  }

  const handleSaveFreight = async (vals) => {
    try {
      await saveFinancials(active.id, { freight: vals.freight, markup: vals.markup })
      showToast('Salvo!')
      await reloadCampaign(active.id)
    } catch(e) { showToast(e.message, 'error') }
  }

  return (
    <div className={`${styles.page} page-enter`}>

      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {onBack && <button className={styles.backBtn} onClick={onBack}><ChevronLeft size={16}/></button>}
          <div>
            <h1 className={styles.pageTitle}><DollarSign size={20}/> Financeiro</h1>
            <p className="text-muted">Custo final por comprador com frete e taxas</p>
          </div>
        </div>
      </div>

      {/* Seletor de cotação */}
      {financialCampaigns.length > 1 && (
        <div className={styles.campaignSelector}>
          <label style={{fontSize:'.78rem',fontWeight:600,color:'var(--text2)',marginBottom:6,display:'block'}}>Cotação</label>
          <div className={styles.campaignTabs}>
            {financialCampaigns.map(c => (
              <button key={c.id}
                className={`${styles.campaignTab} ${c.id === activeCampaignId ? styles.campaignTabActive : ''}`}
                onClick={() => handleSelectCampaign(c.id)}>
                <span>{c.product}</span>
                <Badge status={c.status}>{STATUS_LABEL[c.status]}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {financialCampaigns.length === 0 ? (
        <div className={styles.emptyPage}>
          <DollarSign size={36} style={{opacity:.2}}/>
          <p style={{fontWeight:600,color:'var(--text2)'}}>Nenhuma cotação disponível para o financeiro.</p>
          <p style={{fontSize:'.82rem',color:'var(--text3)',marginTop:4}}>
            Aceite uma proposta em "Cotações → Propostas" para liberar o financeiro.
          </p>
        </div>
      ) : !active ? (
        <div className={styles.emptyPage}><DollarSign size={36} style={{opacity:.2}}/><p>Selecione uma cotação acima.</p></div>
      ) : (
        <div className={styles.content}>

          {/* Nome da cotação + status */}
          <div className={styles.activeCampaignHead}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <h2 style={{fontSize:'1.05rem',fontWeight:700,color:'var(--text)'}}>{active.product}</h2>
              <Badge status={active.status}>{STATUS_LABEL[active.status]}</Badge>
            </div>
            {active.deadline && (
              <span style={{fontSize:'.78rem',color:'var(--text3)'}}>
                Prazo: {active.deadline.split('-').reverse().join('/')}
              </span>
            )}
          </div>

          {/* Barra de resumo */}
          <SummaryBar campaign={active} stats={stats}/>

          {/* Nav das etapas */}
          <div className={styles.stepNav}>
            {[
              { n:1, label:'Fornecedor',  done: lots.length > 0 && stats.avgPrice > 0 },
              { n:2, label:'Frete & Taxa', done: (active.freightTotal??0)>0||(active.markupTotal??0)>0 },
              { n:3, label:'Por Comprador', done: false },
            ].map((s, i, arr) => (
              <div key={s.n} style={{display:'flex',alignItems:'center',gap:0}}>
                <button
                  className={`${styles.stepNavBtn} ${step===s.n?styles.stepNavActive:''} ${s.done?styles.stepNavDone:''}`}
                  onClick={() => setStep(s.n)}
                >
                  <span className={styles.stepNavNum}>{s.done ? '✓' : s.n}</span>
                  <span className={styles.stepNavLabel}>{s.label}</span>
                </button>
                {i < arr.length-1 && <div className={styles.stepNavLine}/>}
              </div>
            ))}
          </div>

          {/* Conteúdo da etapa */}
          {step === 1 && (
            <StepLots
              campaign={active} stats={stats}
              onAdd={runLot(addLot, 'Proposta adicionada!')}
              onRemove={runLot(removeLot, 'Removido')}
              onDone={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepFreight
              campaign={active} stats={stats}
              onSave={handleSaveFreight}
              onDone={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepBuyers campaign={active} stats={stats}/>
          )}
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onDone={clearToast}/>}
    </div>
  )
}
