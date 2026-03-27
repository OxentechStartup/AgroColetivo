import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Share2, Lock, Unlock, CheckCircle, XCircle, Trash2,
  Phone, CalendarDays, MessageCircle, ChevronLeft, Send, Users,
  DollarSign, RotateCcw, Package, TrendingUp,
} from 'lucide-react'
import { Badge }              from '../components/ui/Badge'
import { Button }             from '../components/ui/Button'
import { ProgressBar }        from '../components/ui/ProgressBar'
import { Toast }              from '../components/ui/Toast'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal'
import { NewCampaignModal }   from '../components/NewCampaignModal'
import { ProducerOrderModal } from '../components/ProducerOrderModal'
import { ShareModal }              from '../components/ShareModal'
import { PublishToVendorsModal }   from '../components/PublishToVendorsModal'
import { totalOrdered, STATUS_LABEL, calcSupplyStats, daysUntilDeadline } from '../utils/data'
import { formatCurrency, displayPhone } from '../utils/masks'
import { useToast }           from '../hooks/useToast'
import { fetchOffers, acceptOffer, cancelAcceptedOffer, settleOffersAfterAccept } from '../lib/offers'
import { createLot }          from '../lib/lots'
import styles from './CampaignsPage.module.css'

const fmtDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── Painel de propostas ──────────────────────────────────────────────────────
function OffersPanel({ campaign, onAccepted, onCancelled }) {
  const [offers,     setOffers]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [accepting,  setAccepting]  = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [err,        setErr]        = useState('')

  const reload = useCallback(async () => {
    setLoading(true); setErr('')
    try { setOffers(await fetchOffers(campaign.id)) }
    catch (e) { setErr(e.message); setOffers([]) }
    finally { setLoading(false) }
  }, [campaign.id])

  useEffect(() => { reload() }, [reload])

  const handleCancel = async (offer) => {
    setCancelling(offer.id); setErr('')
    try {
      await cancelAcceptedOffer(offer.id, campaign.id, offer.vendorId)
      await reload()
      onCancelled()
    } catch (e) {
      setErr('Erro ao cancelar aceite: ' + e.message)
      setCancelling(null)
    }
  }

  const handleAccept = async (offer) => {
    setAccepting(offer.id); setErr('')
    try {
      await acceptOffer(offer.id)
      await createLot(campaign.id, {
        vendorId:     offer.vendorId,
        vendorName:   offer.vendorName,
        qtyAvailable: offer.availableQty,
        pricePerUnit: offer.pricePerUnit,
        notes:        offer.notes,
      })
      await settleOffersAfterAccept(campaign.id, offer.id, offer.availableQty)
      onAccepted()
    } catch (e) {
      setErr('Erro ao aceitar proposta: ' + e.message)
      setAccepting(null)
    }
  }

  if (loading) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text3)', fontSize: '.88rem' }}>
      Carregando propostas…
    </div>
  )

  const pending  = offers.filter(o => o.status === 'pending')
  const accepted = offers.filter(o => o.status === 'accepted')
  const rejected = offers.filter(o => o.status === 'rejected')
  const unit     = campaign.unit ?? 'un'
  const unitSing = unit.replace(/s$/, '')

  if (offers.length === 0) return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <Send size={28} style={{ opacity: .2, display: 'block', margin: '0 auto 12px' }} />
      <p style={{ color: 'var(--text2)', fontSize: '.9rem', fontWeight: 600, marginBottom: 4 }}>Nenhuma proposta recebida ainda</p>
      <p style={{ color: 'var(--text3)', fontSize: '.8rem', lineHeight: 1.6 }}>
        Os fornecedores enviam propostas quando a cotação está em status <strong>Negociando</strong>.
      </p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {err && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 'var(--r)', padding: '9px 14px', fontSize: '.82rem' }}>
          {err}
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
            ✓ Proposta aceita
          </div>
          {accepted.map(o => (
            <div key={o.id} style={{
              border: '1.5px solid var(--primary)', borderRadius: 'var(--r)',
              padding: '12px 16px', background: 'var(--primary-dim)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{o.vendorName}</div>
                <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '.9rem' }}>
                  {formatCurrency(o.pricePerUnit)}/{unitSing} · {o.availableQty} {unit}
                  <span style={{ color: 'var(--text2)', fontWeight: 400, fontSize: '.78rem', marginLeft: 8 }}>
                    = {formatCurrency(o.pricePerUnit * o.availableQty)}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm"
                disabled={cancelling !== null}
                onClick={() => handleCancel(o)}
                style={{ color: 'var(--red)', borderColor: 'var(--red)', flexShrink: 0 }}>
                {cancelling === o.id ? 'Cancelando…' : <><RotateCcw size={12} /> Cancelar aceite</>}
              </Button>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            {pending.length} proposta{pending.length !== 1 ? 's' : ''} pendente{pending.length !== 1 ? 's' : ''} — menor ao maior preço
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map((offer, idx) => (
              <div key={offer.id} style={{
                border: `1.5px solid ${idx === 0 ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--r-lg)', padding: '14px 16px',
                background: idx === 0 ? 'var(--primary-dim)' : 'var(--surface)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    {idx === 0 && (
                      <span style={{ fontSize: '.65rem', fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 99 }}>
                        ★ Melhor preço
                      </span>
                    )}
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{offer.vendorName}</span>
                    {offer.vendorCity && <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{offer.vendorCity}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: '.84rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>
                      <strong style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>{formatCurrency(offer.pricePerUnit)}</strong>
                      <span style={{ color: 'var(--text3)' }}> /{unitSing}</span>
                    </span>
                    <span style={{ color: 'var(--text2)' }}>{offer.availableQty} {unit} disponíveis</span>
                    <span style={{ color: 'var(--text2)', fontWeight: 600 }}>= {formatCurrency(offer.pricePerUnit * offer.availableQty)}</span>
                  </div>
                  {offer.notes && (
                    <div style={{ fontSize: '.76rem', color: 'var(--text3)', marginTop: 5, fontStyle: 'italic' }}>{offer.notes}</div>
                  )}
                </div>
                <Button variant="primary" size="sm"
                  disabled={accepting !== null}
                  onClick={() => handleAccept(offer)}>
                  {accepting === offer.id ? 'Aceitando…' : <><CheckCircle size={13} /> Aceitar</>}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
            Recusadas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rejected.map(o => (
              <div key={o.id} style={{
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
                padding: '8px 14px', opacity: .5, fontSize: '.8rem',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>{o.vendorName}</span>
                <span>{formatCurrency(o.pricePerUnit)}/{unitSing}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export function CampaignsPage({ campaigns, vendors, actions, user, setPage }) {
  const {
    addCampaign, addOrder, removeOrder,
    closeCampaign, reopenCampaign, publishToVendors,
    approvePending, rejectPending,
    deleteCampaign, reload, reloadCampaign,
  } = actions

  const { toast, showToast, clearToast } = useToast()

  const [selectedId,    setSelectedId]    = useState(campaigns[0]?.id ?? null)
  const [tab,           setTab]           = useState('orders')
  const [showNew,       setShowNew]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showShare,     setShowShare]     = useState(false)
  const [showPublish,   setShowPublish]   = useState(false)
  const [showOrder,     setShowOrder]     = useState(false)
  const [mobileDetail,  setMobileDetail]  = useState(false)

  const active       = campaigns.find(c => c.id === selectedId) ?? null
  const pendingCount = active?.pendingOrders?.length ?? 0

  const run = (fn, msg) => async (...args) => {
    try   { await fn(...args); if (msg) showToast(msg) }
    catch (e) { showToast(e.message, 'error') }
  }

  const select = (id) => { setSelectedId(id); setTab('orders'); setMobileDetail(true) }

  const handleApprove = async (orderId, order) => {
    try {
      await approvePending(active.id, orderId)
      showToast('Pedido aprovado!')
      if (order.phone) {
        const phone = order.phone.replace(/\D/g, '')
        const msg = encodeURIComponent(
          `Olá, ${order.producerName}! ✅ Seu pedido de *${order.qty} ${active.unit}* de *${active.product}* foi aprovado na cotação coletiva AgroColetivo. Em breve você receberá mais informações. 🌾`
        )
        window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank')
      }
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleOfferAccepted = async () => {
    showToast('Proposta aceita! Lote criado com sucesso.')
    if (active) await reloadCampaign(active.id)
    if (setPage) setPage('financial')
  }

  const handleOfferCancelled = async () => {
    showToast('Aceite cancelado.')
    if (active) await reloadCampaign(active.id)
  }

  // Barra de ação contextual por status
  const renderActionBar = () => {
    if (!active) return null
    const lotsCount = active.lots?.length ?? 0

    if (active.status === 'open') return (
      <div className={styles.actionBar} data-status="open">
        <div className={styles.actionBarInfo}>
          <span className={styles.actionBarDot} style={{ background: 'var(--primary)' }} />
          <div>
            <div className={styles.actionBarTitle}>Coletando pedidos</div>
            {pendingCount > 0 && (
              <div className={styles.actionBarSub} style={{ color: 'var(--red)', fontWeight: 600 }}>
                ⚠ {pendingCount} pedido{pendingCount > 1 ? 's' : ''} aguardando aprovação
              </div>
            )}
          </div>
        </div>
        <div className={styles.actionBarBtns}>
          <Button variant="secondary" size="sm" onClick={() => setShowShare(true)}>
            <Share2 size={13} /> Enviar link
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowPublish(true)}>
            <Send size={13} /> Publicar para fornecedores
          </Button>
          <Button variant="outline" size="sm" onClick={run(() => closeCampaign(active.id), 'Cotação encerrada')}>
            <Lock size={13} /> Encerrar
          </Button>
        </div>
      </div>
    )

    if (active.status === 'negotiating') return (
      <div className={styles.actionBar} data-status="negotiating">
        <div className={styles.actionBarInfo}>
          <span className={styles.actionBarDot} style={{ background: 'var(--amber,#d97706)' }} />
          <div>
            <div className={styles.actionBarTitle}>Aguardando propostas dos fornecedores</div>
            <div className={styles.actionBarSub}>Acesse a aba Propostas para aceitar ou recusar</div>
          </div>
        </div>
        <div className={styles.actionBarBtns}>
          <Button variant="primary" size="sm" onClick={() => setTab('offers')}>
            <Send size={13} /> Ver propostas
          </Button>
          <Button variant="outline" size="sm" onClick={run(() => closeCampaign(active.id), 'Cotação encerrada')}>
            <Lock size={13} /> Encerrar
          </Button>
        </div>
      </div>
    )

    if (active.status === 'closed') return (
      <div className={styles.actionBar} data-status="closed">
        <div className={styles.actionBarInfo}>
          <span className={styles.actionBarDot} style={{ background: 'var(--text3)' }} />
          <div>
            <div className={styles.actionBarTitle}>Cotação encerrada</div>
            <div className={styles.actionBarSub}>{lotsCount > 0 ? 'Acesse o financeiro para definir frete e rateio' : 'Nenhum lote aceito'}</div>
          </div>
        </div>
        <div className={styles.actionBarBtns}>
          {lotsCount > 0 && (
            <>
              <Button variant="primary" size="sm" onClick={() => setPage && setPage('financial')}>
                <DollarSign size={13} /> Financeiro
              </Button>
              <Button variant="whatsapp" size="sm" onClick={() => setShowShare(true)}>
                <MessageCircle size={13} /> Avisar compradores
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={run(() => reopenCampaign(active.id), 'Cotação reaberta')}>
            <Unlock size={13} /> Reabrir
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={13} /> Apagar
          </Button>
        </div>
      </div>
    )

    return null
  }

  return (
    <div className={`${styles.page} page-enter`}>

      <div className={`${styles.header} ${mobileDetail ? styles.headerHidden : ''}`}>
        <div>
          <h1 className={styles.pageTitle}>Cotações</h1>
          <p className="text-muted">Compras coletivas em andamento</p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          <Plus size={15} /> Nova Cotação
        </Button>
      </div>

      <div className={styles.layout}>

        {/* ── Lista lateral ── */}
        <div className={`${styles.list} ${mobileDetail ? styles.listHidden : ''}`}>
          {campaigns.length === 0
            ? <div className={styles.emptyList}>Nenhuma cotação criada ainda.</div>
            : campaigns.map(c => {
                const pend     = c.pendingOrders?.length ?? 0
                const ord      = c.orders?.length ?? 0
                const deadline = daysUntilDeadline(c.deadline)
                return (
                  <button key={c.id}
                    className={`${styles.item} ${c.id === selectedId ? styles.itemActive : ''}`}
                    onClick={() => select(c.id)}>
                    <div className={styles.itemTop}>
                      <span className={styles.itemName}>{c.product}</span>
                      <Badge status={c.status}>{STATUS_LABEL[c.status]}</Badge>
                    </div>
                    <ProgressBar value={totalOrdered(c)} goal={c.goalQty} unit={c.unit} compact />
                    <div className={styles.itemFooter}>
                      <span className={styles.itemMeta}>
                        <Users size={10} /> {ord}
                      </span>
                      {pend > 0 && <span className={styles.pendTag}>{pend} pendente{pend > 1 ? 's' : ''}</span>}
                      {deadline !== null && deadline <= 3 && deadline >= 0 && (
                        <span style={{ color: 'var(--red)', fontSize: '.65rem', fontWeight: 700 }}>{deadline}d</span>
                      )}
                    </div>
                  </button>
                )
              })
          }
        </div>

        {/* ── Detalhe ── */}
        {active ? (
          <div className={`${styles.detail} ${mobileDetail ? styles.detailVisible : ''}`}>

            <button className={styles.backBtn} onClick={() => setMobileDetail(false)}>
              <ChevronLeft size={16} /> Voltar
            </button>

            {/* Cabeçalho */}
            <div className={styles.detailHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 className={styles.detailTitle}>{active.product}</h2>
                <Badge status={active.status}>{STATUS_LABEL[active.status]}</Badge>
              </div>
              {active.deadline && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.78rem', color: 'var(--text3)' }}>
                  <CalendarDays size={12} /> Prazo: {fmtDate(active.deadline)}
                </div>
              )}
            </div>

            {/* Métricas */}
            {(() => {
              const stats = calcSupplyStats(active.lots ?? [], active.orders ?? [], active.freightTotal, active.markupTotal, active.goalQty)
              const ord   = totalOrdered(active)
              const pct   = active.goalQty > 0 ? Math.min(100, Math.round(ord / active.goalQty * 100)) : 0
              return (
                <div className={styles.metricsRow}>
                  <div className={styles.metricCard}>
                    <span className={styles.metricIcon}><Package size={15} /></span>
                    <div>
                      <span className={styles.metricVal}>{ord}<small> {active.unit}</small></span>
                      <span className={styles.metricLabel}>pedidos · meta {active.goalQty} ({pct}%)</span>
                    </div>
                  </div>
                  <div className={styles.metricCard}>
                    <span className={styles.metricIcon}><Users size={15} /></span>
                    <div>
                      <span className={styles.metricVal}>{active.orders?.length ?? 0}</span>
                      <span className={styles.metricLabel}>comprador{(active.orders?.length ?? 0) !== 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                  <div className={styles.metricCard}>
                    <span className={styles.metricIcon}><TrendingUp size={15} /></span>
                    <div>
                      <span className={styles.metricVal}>{stats.avgPrice > 0 ? formatCurrency(stats.avgPrice) : '—'}</span>
                      <span className={styles.metricLabel}>preço médio</span>
                    </div>
                  </div>
                  <div className={styles.metricCard}>
                    <span className={styles.metricIcon}><DollarSign size={15} /></span>
                    <div>
                      <span className={styles.metricVal}>{stats.totalValue > 0 ? formatCurrency(stats.totalValue) : '—'}</span>
                      <span className={styles.metricLabel}>valor total est.</span>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Barra de progresso */}
            <ProgressBar value={totalOrdered(active)} goal={active.goalQty} unit={active.unit} />

            {/* Barra de ação */}
            {renderActionBar()}

            {/* Tabs */}
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${tab === 'orders' ? styles.tabOn : ''}`} onClick={() => setTab('orders')}>
                Compradores ({active.orders?.length ?? 0})
              </button>
              <button className={`${styles.tab} ${tab === 'pending' ? styles.tabOn : ''}`} onClick={() => setTab('pending')}>
                Pendentes{pendingCount > 0 && <span className={styles.pendBadge}>{pendingCount}</span>}
              </button>
              <button className={`${styles.tab} ${tab === 'offers' ? styles.tabOn : ''}`} onClick={() => setTab('offers')}>
                Propostas{(active.lots?.length ?? 0) > 0 && <span className={styles.lotsBadge}>✓</span>}
              </button>
            </div>

            {/* Tab Compradores */}
            {tab === 'orders' && (
              <div className={styles.tableWrap}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 12px 0' }}>
                  <Button variant="outline" size="sm" onClick={() => setShowOrder(true)}>
                    <Plus size={12} /> Adicionar pedido manual
                  </Button>
                </div>
                {(active.orders?.length ?? 0) === 0
                  ? (
                    <div style={{ padding: '32px 0', textAlign: 'center' }}>
                      <Users size={28} style={{ opacity: .2, display: 'block', margin: '0 auto 10px' }} />
                      <p style={{ color: 'var(--text3)', fontSize: '.88rem' }}>Nenhum pedido aprovado ainda.</p>
                    </div>
                  ) : (() => {
                    const stats_ = calcSupplyStats(active.lots ?? [], active.orders ?? [], active.freightTotal, active.markupTotal, active.goalQty)
                    const avgP   = stats_.avgPrice > 0 ? stats_.avgPrice : null
                    return (
                      <table className="tbl">
                        <thead><tr>
                          <th>Comprador</th><th>Qtd</th><th>Preço médio</th><th>Total est.</th><th></th>
                        </tr></thead>
                        <tbody>
                          {active.orders.map((o, i) => {
                            const total = avgP != null ? avgP * o.qty : null
                            return (
                              <tr key={i}>
                                <td>
                                  <div style={{ fontWeight: 700 }}>{o.producerName}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text3)', fontSize: '.7rem', marginTop: 2 }}>
                                    <Phone size={10} /> {displayPhone(o.phone)}
                                  </div>
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>{o.qty} {active.unit}</td>
                                <td>{avgP != null ? formatCurrency(avgP) : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                                <td>{total != null ? <strong style={{ color: 'var(--primary)' }}>{formatCurrency(total)}</strong> : <span style={{ color: 'var(--text3)' }}>Aguard.</span>}</td>
                                <td>
                                  <button className={styles.delBtn} title="Remover"
                                    onClick={run(() => removeOrder(active.id, o.orderId), 'Pedido removido')}>
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )
                  })()
                }
              </div>
            )}

            {/* Tab Pendentes */}
            {tab === 'pending' && (
              <div className={styles.tableWrap}>
                {pendingCount === 0
                  ? <p className="text-muted" style={{ padding: '32px 0', textAlign: 'center' }}>Nenhum pedido pendente.</p>
                  : (
                    <table className="tbl">
                      <thead><tr>
                        <th>Comprador</th><th>WhatsApp</th><th>Qtd</th><th>Data</th><th>Ação</th>
                      </tr></thead>
                      <tbody>
                        {active.pendingOrders.map((o, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 700 }}>{o.producerName}</td>
                            <td style={{ color: 'var(--text3)' }}>{displayPhone(o.phone)}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{o.qty} {active.unit}</td>
                            <td style={{ color: 'var(--text3)' }}>{fmtDate(o.confirmedAt)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button className={styles.approveBtn} title="Aprovar" onClick={() => handleApprove(o.orderId, o)}><CheckCircle size={15} /></button>
                                <button className={styles.rejectBtn} title="Recusar" onClick={run(() => rejectPending(active.id, o.orderId), 'Recusado')}><XCircle size={15} /></button>
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

            {/* Tab Propostas */}
            {tab === 'offers' && (
              <OffersPanel
                campaign={active}
                onAccepted={handleOfferAccepted}
                onCancelled={handleOfferCancelled}
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
          <ModalHeader title="Apagar cotação" onClose={() => setConfirmDelete(false)} />
          <ModalBody>
            <p style={{ color: 'var(--text2)', fontSize: '.88rem', lineHeight: 1.6 }}>
              Tem certeza que deseja apagar <strong style={{ color: 'var(--text)' }}>{active.product}</strong>?
              <br />Todos os pedidos e lotes serão removidos permanentemente.
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
              try { await deleteCampaign(deletedId); showToast('Cotação apagada') }
              catch (e) { setSelectedId(deletedId); showToast(e.message, 'error') }
            }}>Apagar</Button>
          </ModalFooter>
        </Modal>
      )}

      {showNew     && <NewCampaignModal onClose={() => setShowNew(false)} onSave={run(addCampaign, 'Cotação criada!')} />}
      {showShare   && active && <ShareModal campaign={active} onClose={() => setShowShare(false)} />}
      {showPublish && active && (
        <PublishToVendorsModal
          campaign={active} vendors={vendors ?? []}
          onPublish={async (id) => { await publishToVendors(id); showToast('Publicado! Aguardando propostas.') }}
          onClose={() => { setShowPublish(false); setTab('offers') }}
        />
      )}
      {showOrder && active && (
        <ProducerOrderModal campaign={active} onClose={() => setShowOrder(false)}
          onSave={run(o => addOrder(active.id, o), 'Pedido adicionado!')} />
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
