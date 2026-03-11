import { useState } from 'react'
import {
  Plus, Share2, Lock, Unlock, CheckCircle, XCircle, Trash2,
  Phone, CalendarDays, MessageCircle, Info, ChevronLeft,
} from 'lucide-react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { Toast } from '../components/Toast'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal'
import { LotsPanel, calcSupplyStats } from '../components/LotsPanel'
import { NewCampaignModal } from '../components/NewCampaignModal'
import { ProducerOrderModal } from '../components/ProducerOrderModal'
import { ShareModal } from '../components/ShareModal'
import { VendorOrderModal } from '../components/VendorOrderModal'
import { totalOrdered, STATUS_LABEL, campaignRealValue, campaignValueIsEstimate, calcPlatformFee } from '../utils/data'
import { formatCurrency, displayPhone } from '../utils/masks'
import { useToast } from '../hooks/useToast'
import styles from './CampaignsPage.module.css'

const fmtDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function CampaignsPage({ campaigns, vendors, actions, user }) {
  const {
    addCampaign, addOrder, removeOrder, closeCampaign, reopenCampaign,
    approvePending, rejectPending, addLot, removeLot, saveFinancials,
    deleteCampaign,
  } = actions
  const { toast, showToast, clearToast } = useToast()

  const [selectedId,      setSelectedId]      = useState(campaigns[0]?.id ?? null)
  const [tab,             setTab]             = useState('orders')
  const [showNew,         setShowNew]         = useState(false)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const [showShare,       setShowShare]       = useState(false)
  const [showOrder,       setShowOrder]       = useState(false)
  const [showVendorOrder, setShowVendorOrder] = useState(false)
  const [mobileDetail,    setMobileDetail]    = useState(false)

  const active       = campaigns.find(c => c.id === selectedId) ?? null
  const pendingCount = active?.pendingOrders?.length ?? 0

  const activeStats = active
    ? calcSupplyStats(active.lots ?? [], active.orders ?? [], active.freightTotal, active.markupTotal)
    : null

  const goalMet = active
    ? totalOrdered(active) >= active.goalQty && active.goalQty > 0 && (activeStats?.isFulfilled ?? false)
    : false

  const activeTotalValue = active ? campaignRealValue(active) : 0
  const activeIsEstimate = active ? campaignValueIsEstimate(active) : false
  const { feeValue: activeFee } = calcPlatformFee(activeTotalValue, 1.5)

  const run = (fn, msg) => async (...args) => {
    try   { await fn(...args); showToast(msg) }
    catch (e) { showToast(e.message, 'error') }
  }

  const select = (id) => {
    setSelectedId(id)
    setTab('orders')
    setMobileDetail(true)
  }

  return (
    <div className={`${styles.page} page-enter`}>

      <div className={`${styles.header} ${mobileDetail ? styles.headerHidden : ''}`}>
        <div>
          <h1 className={styles.pageTitle}>Cotações</h1>
          <p className="text-muted">Compras coletivas em andamento</p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          <Plus size={15}/> Nova Cotação
        </Button>
      </div>

      <div className={styles.layout}>

        <div className={`${styles.list} ${mobileDetail ? styles.listHidden : ''}`}>
          {campaigns.length === 0
            ? <div className={styles.emptyList}>Nenhuma cotação ainda.</div>
            : campaigns.map(c => {
                const pend = c.pendingOrders?.length ?? 0
                return (
                  <button key={c.id}
                    className={`${styles.item} ${c.id === selectedId ? styles.itemActive : ''}`}
                    onClick={() => select(c.id)}>
                    <div className={styles.itemTop}>
                      <span className={styles.itemName}>{c.product}</span>
                      <Badge status={c.status}>{STATUS_LABEL[c.status]}</Badge>
                    </div>
                    <div className={styles.itemTotalRow}>
                      <span className={styles.itemMetaInline}>
                        {c.orders.length} prod. · meta {c.goalQty} {c.unit}
                        {pend > 0 && <span className={styles.pendTag}>{pend} pendente{pend>1?'s':''}</span>}
                      </span>
                      {campaignRealValue(c) > 0 && (
                        <span className={styles.itemTotal}>
                          {formatCurrency(campaignRealValue(c))}
                        </span>
                      )}
                    </div>
                    <ProgressBar value={totalOrdered(c)} goal={c.goalQty} unit={c.unit} compact/>
                  </button>
                )
              })
          }
        </div>

        {active ? (
          <div className={`${styles.detail} ${mobileDetail ? styles.detailVisible : ''}`}>
            <button className={styles.backBtn} onClick={() => setMobileDetail(false)}>
              <ChevronLeft size={16}/> Voltar para lista
            </button>

            <div className={styles.detailHead}>
              <div className={styles.detailHeadLeft}>
                <h2 className={styles.detailTitle}>{active.product}</h2>
                <div className={styles.detailMeta}>
                  <Badge status={active.status}>{STATUS_LABEL[active.status]}</Badge>
                  {active.deadline && (
                    <span className="text-muted" style={{display:'flex',alignItems:'center',gap:4}}>
                      <CalendarDays size={12}/> {fmtDate(active.deadline)}
                    </span>
                  )}
                </div>
              </div>
              {activeTotalValue > 0 && (
                <div className={styles.detailTotalBox}>
                  <span className={styles.detailTotalLabel}>Valor total{activeIsEstimate ? ' est.' : ''}</span>
                  <span className={styles.detailTotalValue}>{formatCurrency(activeTotalValue)}</span>
                </div>
              )}
            </div>

            <div className={styles.progressWrap}>
              <ProgressBar value={totalOrdered(active)} goal={active.goalQty} unit={active.unit}/>
            </div>

            {activeTotalValue > 0 && (
              <div className={styles.feeBanner}>
                <Info size={13} style={{flexShrink:0}}/>
                <span>
                  Taxa da plataforma <strong>1,5%</strong> sobre o valor total{activeIsEstimate ? ' estimado' : ''}:
                  {' '}<strong style={{color:'var(--primary)'}}>{formatCurrency(activeFee)}</strong>
                  {' '}(total{activeIsEstimate ? ' est.' : ''}: {formatCurrency(activeTotalValue)})
                </span>
              </div>
            )}

            {goalMet && (
              <div className={styles.goalBanner}>
                <div className={styles.goalBannerText}>
                  <span className={styles.goalBannerTitle}>Meta atingida!</span>
                  <span className={styles.goalBannerSub}>Fornecedores cobrem toda a demanda.</span>
                </div>
                <button className={styles.goalMetBtn} onClick={() => setShowVendorOrder(true)}>
                  <MessageCircle size={14}/> Fazer Pedido
                </button>
              </div>
            )}

            {(() => {
              const s = activeStats
              return (
                <div className={styles.statsGrid}>
                  {[
                    { l: 'Pedidos',      v: `${totalOrdered(active)} ${active.unit}` },
                    { l: 'Meta',         v: `${active.goalQty} ${active.unit}` },
                    { l: 'Produtores',   v: active.orders.length },
                    { l: 'Pendentes',    v: pendingCount },
                    { l: 'Toneladas',    v: `${((totalOrdered(active)*(active.unitWeight??25))/1000).toFixed(1)} t` },
                    { l: 'Preço médio',  v: active.pricePerUnit > 0 ? formatCurrency(active.pricePerUnit) : (s.avgPrice > 0 ? formatCurrency(s.avgPrice) : '—') },
                  ].map(({ l, v }) => (
                    <div key={l} className={styles.stat}>
                      <span className={styles.statL}>{l}</span>
                      <span className={styles.statV}>{v}</span>
                    </div>
                  ))}
                </div>
              )
            })()}

            <div className={styles.actions}>
              {active.status === 'open' || active.status === 'negotiating' ? <>
                <Button variant="secondary" size="sm" onClick={() => setShowOrder(true)}>
                  <Plus size={13}/> Pedido
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowShare(true)}>
                  <Share2 size={13}/> Compartilhar
                </Button>
                <Button variant="outline" size="sm"
                  onClick={run(() => closeCampaign(active.id), 'Cotação encerrada')}>
                  <Lock size={13}/> Encerrar
                </Button>
              </> : <>
                <Button variant="secondary" size="sm" onClick={() => setShowShare(true)}>
                  <Share2 size={13}/> Fornecedor
                </Button>
                <Button variant="outline" size="sm"
                  onClick={run(() => reopenCampaign(active.id), 'Cotação reaberta')}>
                  <Unlock size={13}/> Reabrir
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={13}/> Apagar
                </Button>
              </>}

              {!goalMet && (active.status === 'open' || active.status === 'negotiating') && (active.lots?.length ?? 0) > 0 && (
                <Button variant="whatsapp" size="sm" onClick={() => setShowVendorOrder(true)}>
                  <MessageCircle size={13}/> Fazer Pedido
                </Button>
              )}
            </div>

            <div className={styles.tabs}>
              <button className={`${styles.tab} ${tab==='orders'?styles.tabOn:''}`} onClick={() => setTab('orders')}>
                Aprovados ({active.orders.length})
              </button>
              <button className={`${styles.tab} ${tab==='pending'?styles.tabOn:''}`} onClick={() => setTab('pending')}>
                Pendentes{pendingCount > 0 && <span className={styles.pendBadge}>{pendingCount}</span>}
              </button>
              <button className={`${styles.tab} ${tab==='lots'?styles.tabOn:''}`} onClick={() => setTab('lots')}>
                Fornecedores{(active.lots?.length ?? 0) > 0 && <span className={styles.lotsBadge}>{active.lots.length}</span>}
              </button>
            </div>

            {tab === 'orders' && (() => {
              const s         = calcSupplyStats(active.lots ?? [], active.orders, active.freightTotal, active.markupTotal)
              // Prioriza pricePerUnit confirmado; fallback: preço médio ponderado dos lotes
              const unitPrice = active.pricePerUnit > 0 ? active.pricePerUnit : (s.avgPrice > 0 ? s.avgPrice : null)
              const n         = active.orders.length
              const freightEach = n > 0 ? (active.freightTotal ?? 0) / n : 0
              const markupEach  = n > 0 ? (active.markupTotal  ?? 0) / n : 0
              return (
                <div className={styles.tableWrap}>
                  {active.orders.length === 0
                    ? <p className="text-muted" style={{padding:'28px 0',textAlign:'center'}}>Nenhum pedido aprovado ainda.</p>
                    : (
                      <table className="tbl">
                        <thead><tr>
                          <th>Produtor</th><th>Qtd</th><th>Ton.</th><th>Preço/un.</th><th>Total</th><th></th>
                        </tr></thead>
                        <tbody>
                          {active.orders.map((o, i) => {
                            const produto = unitPrice != null ? unitPrice * o.qty : null
                            const total   = produto  != null ? produto + freightEach + markupEach : null
                            return (
                              <tr key={i}>
                                <td>
                                  <div style={{fontWeight:700}}>{o.producerName}</div>
                                  <div style={{display:'flex',alignItems:'center',gap:3,color:'var(--text3)',fontSize:'.7rem',marginTop:2}}>
                                    <Phone size={10}/> {displayPhone(o.phone)}
                                  </div>
                                </td>
                                <td style={{whiteSpace:'nowrap'}}>{o.qty} {active.unit}</td>
                                <td style={{color:'var(--text2)'}}>{((o.qty*(active.unitWeight??25))/1000).toFixed(1)} t</td>
                                <td>
                                  {unitPrice != null
                                    ? formatCurrency(unitPrice)
                                    : <span style={{color:'var(--text3)'}}>—</span>}
                                </td>
                                <td>
                                  {total != null
                                    ? <strong style={{color:'var(--primary)'}}>{formatCurrency(total)}</strong>
                                    : <span style={{color:'var(--text3)'}}>Aguardando preço</span>}
                                </td>
                                <td>
                                  <button className={styles.delBtn}
                                    onClick={run(() => removeOrder(active.id, o.orderId), 'Pedido removido')}
                                    title="Remover pedido">
                                    <Trash2 size={13}/>
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )
                  }
                </div>
              )
            })()}

            {tab === 'pending' && (
              <div className={styles.tableWrap}>
                {pendingCount === 0
                  ? <p className="text-muted" style={{padding:'28px 0',textAlign:'center'}}>Nenhum pedido pendente.</p>
                  : (
                    <table className="tbl">
                      <thead><tr>
                        <th>Produtor</th><th>WhatsApp</th><th>Qtd</th><th>Data</th><th>Ação</th>
                      </tr></thead>
                      <tbody>
                        {active.pendingOrders.map((o, i) => (
                          <tr key={i}>
                            <td style={{fontWeight:700}}>{o.producerName}</td>
                            <td style={{color:'var(--text3)'}}>{displayPhone(o.phone)}</td>
                            <td style={{whiteSpace:'nowrap'}}>{o.qty} {active.unit}</td>
                            <td style={{color:'var(--text3)'}}>{fmtDate(o.confirmedAt)}</td>
                            <td>
                              <div style={{display:'flex',gap:5}}>
                                <button className={styles.approveBtn}
                                  onClick={run(() => approvePending(active.id, o.orderId), 'Aprovado!')}
                                  title="Aprovar"><CheckCircle size={15}/></button>
                                <button className={styles.rejectBtn}
                                  onClick={run(() => rejectPending(active.id, o.orderId), 'Recusado')}
                                  title="Recusar"><XCircle size={15}/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>
            )}

            {tab === 'lots' && (
              <LotsPanel
                campaign={active}
                vendors={vendors}
                onAddLot={run(addLot, 'Fornecedor adicionado!')}
                onRemoveLot={run(removeLot, 'Fornecedor removido')}
                onSaveFreight={run((id, vals) => saveFinancials(id, { freight: vals.freight, markup: vals.markup }), 'Salvo!')}
              />
            )}
          </div>
        ) : (
          <div className={`${styles.noSel} ${mobileDetail ? styles.detailVisible : ''}`}>
            Selecione uma cotação ao lado
          </div>
        )}
      </div>

      {confirmDelete && active && (
        <Modal onClose={() => setConfirmDelete(false)} size="sm">
          <ModalHeader title="Apagar cotação" onClose={() => setConfirmDelete(false)}/>
          <ModalBody>
            <p style={{color:'var(--text2)',fontSize:'.88rem',lineHeight:1.6}}>
              Tem certeza que deseja apagar <strong style={{color:'var(--text)'}}>{active.product}</strong>?
              <br/>Esta ação remove todos os pedidos e lotes permanentemente.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button variant="danger" onClick={async () => {
              const deletedId = active.id
              const remaining = campaigns.filter(c => c.id !== deletedId)
              setConfirmDelete(false)
              setSelectedId(remaining[0]?.id ?? null)
              setMobileDetail(false)
              try {
                await deleteCampaign(deletedId)
                showToast('Cotação apagada')
              } catch(e) {
                setSelectedId(deletedId)
                showToast(e.message, 'error')
              }
            }}>Apagar</Button>
          </ModalFooter>
        </Modal>
      )}

      {showNew    && <NewCampaignModal onClose={() => setShowNew(false)} onSave={run(addCampaign, 'Cotação criada!')}/>}
      {showShare  && active && <ShareModal campaign={active} onClose={() => setShowShare(false)}/>}
      {showOrder  && active && (
        <ProducerOrderModal campaign={active} onClose={() => setShowOrder(false)}
          onSave={run(o => addOrder(active.id, o), 'Pedido adicionado!')}/>
      )}
      {showVendorOrder && active && (
        <VendorOrderModal campaign={active} vendors={vendors} onClose={() => setShowVendorOrder(false)}/>
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onDone={clearToast}/>}
    </div>
  )
}
