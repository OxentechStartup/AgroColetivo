import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, TrendingUp, Package, Users, Activity, BarChart2,
  CheckCircle, Clock, ShieldOff, Shield, Phone, MapPin,
  ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Search,
  Trash2, CreditCard, AlertCircle,
} from 'lucide-react'
import { Button } from '../components/Button'
import { Card, CardHeader, CardTitle, CardBody } from '../components/Card'
import { Badge } from '../components/Badge'
import { totalOrdered, campaignRealValue, campaignValueIsEstimate, calcPlatformFee, STATUS_LABEL } from '../utils/data'
import { formatCurrency } from '../utils/masks'
import { fetchGestorsAdmin, setGestorActive } from '../lib/auth'
import { markFeePaid } from '../lib/campaigns'
import styles from './AdminPage.module.css'

const fmtDate = iso => iso ? iso.split('T')[0].split('-').reverse().join('/') : '—'
const fmtPhone = p => p ? p.replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, '($1) $2 $3-$4') : '—'

function KpiCard({ icon: Icon, label, value, sub, color = 'green' }) {
  return (
    <div className={`${styles.kpi} ${styles[`kpi_${color}`]}`}>
      <div className={styles.kpiIcon}><Icon size={18}/></div>
      <div className={styles.kpiVal}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  )
}

function MiniBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={styles.miniBarTrack}>
      <div className={styles.miniBarFill} style={{ width: `${pct}%` }}/>
    </div>
  )
}

function GestorRow({ gestor, campaigns, onToggle, toggling }) {
  const [expanded, setExpanded] = useState(false)
  const gestorCampaigns = campaigns.filter(c => c.pivoId === gestor.id && c.status !== 'finished')
  const totalFee = gestorCampaigns.reduce((s, c) => s + calcPlatformFee(campaignRealValue(c), 1.5).feeValue, 0)
  const isBlocked = !gestor.active

  return (
    <div className={`${styles.gestorCard} ${isBlocked ? styles.gestorBlocked : ''}`}>
      <div className={styles.gestorRow}>
        <div className={`${styles.gestorStatusDot} ${isBlocked ? styles.dotBlocked : styles.dotActive}`}/>
        <div className={styles.gestorInfo}>
          <div className={styles.gestorName}>{gestor.name}</div>
          <div className={styles.gestorMeta}>
            <span><Phone size={10}/> {fmtPhone(gestor.phone)}</span>
            {gestor.city && <span><MapPin size={10}/> {gestor.city}</span>}
            <span>desde {fmtDate(gestor.created_at)}</span>
          </div>
        </div>
        <div className={styles.gestorStats}>
          <div className={styles.gestorStat}>
            <span className={styles.gestorStatVal}>{gestorCampaigns.length}</span>
            <span className={styles.gestorStatLbl}>cotações</span>
          </div>
          <div className={styles.gestorStat}>
            <span className={styles.gestorStatVal} style={{color:'var(--primary)'}}>{formatCurrency(totalFee)}</span>
            <span className={styles.gestorStatLbl}>taxa gerada</span>
          </div>
        </div>
        <div className={styles.gestorActions}>
          <button
            className={`${styles.toggleBtn} ${isBlocked ? styles.unblockBtn : styles.blockBtn}`}
            onClick={() => onToggle(gestor.id, isBlocked)}
            disabled={toggling === gestor.id}
          >
            {toggling === gestor.id
              ? <RefreshCw size={13} className={styles.spin}/>
              : isBlocked
                ? <><Shield size={13}/> Desbloquear</>
                : <><ShieldOff size={13}/> Bloquear</>}
          </button>
          {gestorCampaigns.length > 0 && (
            <button className={styles.expandGestorBtn} onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className={styles.gestorCampaigns}>
          {gestorCampaigns.map((c, i) => {
            const fee = calcPlatformFee(campaignRealValue(c), 1.5).feeValue
            const isEst = campaignValueIsEstimate(c)
            const ordered = totalOrdered(c)
            const pct = c.goalQty > 0 ? Math.min(100, Math.round((ordered / c.goalQty) * 100)) : 0
            return (
              <div key={i} className={styles.gestorCampRow}>
                <div className={styles.gestorCampLeft}>
                  <Badge status={c.status}>{STATUS_LABEL[c.status]}</Badge>
                  <span className={styles.gestorCampName}>{c.product}</span>
                </div>
                <div className={styles.gestorCampMid}>
                  <MiniBar value={ordered} max={c.goalQty}/>
                  <span className={styles.gestorCampPct}>{pct}%</span>
                </div>
                <span className={styles.gestorCampFee}>
                  {fee > 0 ? <>{formatCurrency(fee)}{isEst && <span style={{fontSize:'.65rem',color:'var(--text3)',marginLeft:3}}>est.</span>}</> : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {isBlocked && (
        <div className={styles.blockedBanner}>
          <AlertTriangle size={11}/>
          Acesso bloqueado — este gestor não consegue fazer login
        </div>
      )}
    </div>
  )
}

export function AdminPage({ campaigns, actions, reload }) {
  const [tab,      setTab]      = useState('dashboard')
  const [gestors,    setGestors]    = useState([])
  const [gestorLoad, setGestorLoad] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [search,   setSearch]   = useState('')
  const [paying, setPaying] = useState(null)
  const [confirmBill, setConfirmBill] = useState(null)

  const loadGestors = useCallback(async () => {
    setGestorLoad(true)
    try { setGestors(await fetchGestorsAdmin()) }
    catch (e) { console.error(e) }
    finally { setGestorLoad(false) }
  }, [])

  useEffect(() => { loadGestors() }, [loadGestors])

  const [toggleError, setToggleError] = useState(null)

  const handleToggle = async (userId, newActive) => {
    setToggling(userId)
    setToggleError(null)
    try {
      await setGestorActive(userId, newActive)
      // Recarrega do banco para confirmar valor real
      await loadGestors()
    } catch (e) {
      console.error('Erro ao bloquear/desbloquear:', e)
      setToggleError(e.message || 'Erro ao atualizar. Verifique as permissões RLS no Supabase.')
    }
    finally { setToggling(null) }
  }

  const allValues = campaigns.map(c => {
    const totalValue = campaignRealValue(c)
    const isEstimate = campaignValueIsEstimate(c)
    const fee        = calcPlatformFee(totalValue, 1.5)
    return { ...c, totalValue, isEstimate, fee }
  })
  const closedCamps    = allValues.filter(c => c.status === 'finished')
  const openCamps      = allValues.filter(c => c.status === 'open' || c.status === 'negotiating')
  const totalVolume    = allValues.reduce((s, c) => s + c.totalValue, 0)
  const totalFee       = allValues.reduce((s, c) => s + c.fee.feeValue, 0)
  const closedFee      = closedCamps.reduce((s, c) => s + c.fee.feeValue, 0)
  const projectedFee   = openCamps.reduce((s, c) => s + c.fee.feeValue, 0)
  const closedVolume   = closedCamps.reduce((s, c) => s + c.totalValue, 0)
  const uniqueProducers = new Set(campaigns.flatMap(c => c.orders.map(o => o.producerName))).size
  const uniqueVendors   = new Set(campaigns.flatMap(c => (c.lots ?? []).map(l => l.vendorName))).size
  const totalOrders_n   = campaigns.reduce((s, c) => s + c.orders.length + (c.pendingOrders?.length ?? 0), 0)

  const blockedGestors   = gestors.filter(p => !p.active)
  const filteredGestors  = gestors.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone ?? '').includes(search) ||
    (p.city ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.heading}>
        <div>
          <h1>Painel Administrativo</h1>
          <p className="text-muted">Monitoramento financeiro e gestão da plataforma</p>
        </div>
        <div className={styles.feeBadge}>
          <Activity size={12}/> Taxa: <strong>1,5% por cotação</strong>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'dashboard' ? styles.tabOn : ''}`} onClick={() => setTab('dashboard')}>
          <BarChart2 size={14}/> Dashboard
        </button>
        <button className={`${styles.tab} ${tab === 'gestors' ? styles.tabOn : ''}`} onClick={() => setTab('gestors')}>
          <Users size={14}/> Gestores
          {blockedGestors.length > 0 && <span className={styles.alertDot}>{blockedGestors.length}</span>}
        </button>
        <button className={`${styles.tab} ${tab === 'cotacoes' ? styles.tabOn : ''}`} onClick={() => setTab('cotacoes')}>
          <Package size={14}/> Relatório
        </button>
        <button className={`${styles.tab} ${tab === 'cobranca' ? styles.tabOn : ''}`} onClick={() => setTab('cobranca')}>
          <CreditCard size={14}/> Cobranças
          {closedCamps.length > 0 && <span className={styles.alertDot}>{closedCamps.length}</span>}
        </button>
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (<>
        <div className={styles.kpiGrid}>
          <KpiCard icon={DollarSign} color="green" label="Receita Realizada"      value={formatCurrency(closedFee)}    sub={`${closedCamps.length} cotações encerradas`}/>
          <KpiCard icon={TrendingUp} color="blue"  label="Receita Projetada"      value={formatCurrency(projectedFee)} sub={`${openCamps.length} em aberto`}/>
          <KpiCard icon={Package}    color="amber"  label="Volume Total"           value={formatCurrency(totalVolume)}  sub="Soma de todas as cotações"/>
          <KpiCard icon={Users}      color="gray"   label="Participantes"          value={`${uniqueProducers} prod.`}   sub={`${uniqueVendors} fornec. · ${totalOrders_n} pedidos`}/>
        </div>

        <div className={styles.summaryStrip}>
          {[
            { icon: CheckCircle, color: 'var(--primary)', val: formatCurrency(closedVolume),  lbl: 'Volume encerrado' },
            { icon: Clock,       color: 'var(--blue)',    val: formatCurrency(openCamps.reduce((s,c)=>s+c.totalValue,0)), lbl: 'Em andamento' },
            { icon: BarChart2,   color: 'var(--amber)',   val: formatCurrency(totalFee),       lbl: 'Receita total' },
            { icon: Users,       color: 'var(--text3)',   val: `${gestors.filter(p=>p.active).length} / ${gestors.length}`, lbl: 'Gestores ativos' },
          ].map(({ icon: Icon, color, val, lbl }, i) => (
            <div key={i} className={styles.summaryItem}>
              <Icon size={15} style={{color, flexShrink:0}}/>
              <div>
                <div className={styles.summaryVal}>{val}</div>
                <div className={styles.summarySub}>{lbl}</div>
              </div>
            </div>
          ))}
        </div>

        {gestors.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Receita por Gestor</CardTitle></CardHeader>
            <CardBody noPad>
              <div className={styles.tableWrap}>
                <table className="tbl">
                  <thead>
                    <tr><th>Gestor</th><th>Cotações</th><th>Volume</th><th>Taxa</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {gestors.map(p => {
                      const pc  = campaigns.filter(c => c.pivoId === p.id)
                      const vol = pc.reduce((s, c) => s + campaignRealValue(c), 0)
                      const fee = pc.reduce((s, c) => s + calcPlatformFee(campaignRealValue(c), 1.5).feeValue, 0)
                      const hasEst = pc.some(c => campaignValueIsEstimate(c))
                      return (
                        <tr key={p.id} style={!p.active ? {opacity:.5,background:'var(--red-dim)'} : {}}>
                          <td><div style={{fontWeight:600}}>{p.name}</div>{p.city && <div style={{fontSize:'.7rem',color:'var(--text3)'}}>{p.city}</div>}</td>
                          <td style={{color:'var(--text2)'}}>{pc.length}</td>
                          <td>{vol > 0 ? <>{formatCurrency(vol)}{hasEst && <span style={{fontSize:'.65rem',color:'var(--text3)',marginLeft:3}}>est.</span>}</> : <span style={{color:'var(--text3)'}}>—</span>}</td>
                          <td>{fee > 0 ? <strong style={{color:'var(--primary)'}}>{formatCurrency(fee)}{hasEst && <span style={{fontSize:'.65rem',fontWeight:400,color:'var(--text3)',marginLeft:3}}>est.</span>}</strong> : <span style={{color:'var(--text3)'}}>—</span>}</td>
                          <td>{p.active ? <span className={styles.activePill}>Ativo</span> : <span className={styles.blockedPill}>Bloqueado</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {openCamps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Em Andamento</CardTitle>
              <span style={{fontSize:'.78rem',color:'var(--text3)'}}>Potencial: <strong style={{color:'var(--blue)'}}>{formatCurrency(projectedFee)}</strong></span>
            </CardHeader>
            <CardBody noPad>
              <div className={styles.tableWrap}>
                <table className="tbl">
                  <thead><tr><th>Produto</th><th>Gestor</th><th>Produtores</th><th>Progresso</th><th>Taxa Est.</th></tr></thead>
                  <tbody>
                    {openCamps.map((c, i) => {
                      const ord = totalOrdered(c)
                      const pct = c.goalQty > 0 ? Math.round((ord / c.goalQty) * 100) : 0
                      const gestor = gestors.find(p => p.id === c.pivoId)
                      return (
                        <tr key={i}>
                          <td style={{fontWeight:600}}>{c.product}</td>
                          <td style={{fontSize:'.8rem',color:'var(--text2)'}}>{gestor?.name ?? '—'}</td>
                          <td style={{color:'var(--text2)'}}>{c.orders.length}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{width:64,height:5,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
                                <div style={{width:`${pct}%`,height:'100%',background:'var(--primary)',borderRadius:3}}/>
                              </div>
                              <span style={{fontSize:'.75rem',color:'var(--text2)'}}>{pct}%</span>
                            </div>
                          </td>
                          <td>{c.fee.feeValue > 0 ? <span style={{color:'var(--blue)',fontWeight:600}}>{formatCurrency(c.fee.feeValue)}</span> : <span style={{color:'var(--text3)'}}>—</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}
      </>)}

      {/* ── PIVÔS ── */}
      {tab === 'gestors' && (
        <div className={styles.gestorsSection}>
          <div className={styles.gestorsHeader}>
            <div className={styles.gestorsQuickStats}>
              <div className={styles.qStat}><span style={{color:'var(--primary)'}}>{gestors.filter(p=>p.active).length}</span> ativos</div>
              <div className={styles.qStatDiv}/>
              <div className={styles.qStat}><span style={{color:'var(--red)'}}>{blockedGestors.length}</span> bloqueados</div>
            </div>
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon}/>
              <input className={styles.searchInput} placeholder="Buscar gestor…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>

          {toggleError && (
            <div className={styles.alertBanner} style={{background:'var(--red-dim)',borderColor:'var(--red-border)',color:'var(--red)'}}>
              <AlertTriangle size={13}/> {toggleError}
            </div>
          )}

          {blockedGestors.length > 0 && !search && (
            <div className={styles.alertBanner}>
              <AlertTriangle size={13}/>
              {blockedGestors.length} gestor{blockedGestors.length > 1 ? 'es' : ''} com acesso bloqueado. Clique em "Desbloquear" para restaurar o acesso.
            </div>
          )}

          {gestorLoad ? (
            <div className={styles.gestorLoading}>Carregando gestors…</div>
          ) : filteredGestors.length === 0 ? (
            <div className={styles.gestorEmpty}>{search ? 'Nenhum resultado.' : 'Nenhum gestor cadastrado.'}</div>
          ) : (
            <div className={styles.gestorList}>
              {filteredGestors.map(p => (
                <GestorRow key={p.id} gestor={p} campaigns={campaigns} onToggle={handleToggle} toggling={toggling}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COTAÇÕES ── */}
      {tab === 'cotacoes' && (
        <Card>
          <CardHeader>
            <CardTitle>Relatório — Cotações Encerradas</CardTitle>
            <span style={{fontSize:'.78rem',color:'var(--text3)'}}>Receita realizada: <strong style={{color:'var(--primary)'}}>{formatCurrency(closedFee)}</strong></span>
          </CardHeader>
          <CardBody noPad>
            {closedCamps.length === 0 ? (
              <p className="text-muted text-center" style={{padding:'32px'}}>Nenhuma cotação encerrada ainda.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className="tbl">
                  <thead>
                    <tr><th>Produto</th><th>Gestor</th><th>Produtores</th><th>Qtd</th><th>Valor Bruto</th><th>Taxa (1,5%)</th></tr>
                  </thead>
                  <tbody>
                    {closedCamps.map((c, i) => {
                      const gestor = gestors.find(p => p.id === c.pivoId)
                      return (
                        <tr key={i}>
                          <td><div style={{fontWeight:600}}>{c.product}</div>{c.deadline && <div style={{fontSize:'.7rem',color:'var(--text3)'}}>Prazo: {fmtDate(c.deadline)}</div>}</td>
                          <td style={{fontSize:'.8rem',color:'var(--text2)'}}>{gestor?.name ?? '—'}</td>
                          <td style={{color:'var(--text2)'}}>{c.orders.length}</td>
                          <td style={{color:'var(--text2)'}}>{totalOrdered(c)} {c.unit}</td>
                          <td>{c.totalValue > 0
                            ? <>{formatCurrency(c.totalValue)}{c.isEstimate && <span style={{fontSize:'.65rem',color:'var(--text3)',marginLeft:4}}>est.</span>}</>
                            : <span style={{color:'var(--text3)'}}>Sem fornecedor</span>}
                          </td>
                          <td>{c.fee.feeValue > 0
                            ? <><span style={{color:'var(--primary)',fontWeight:600}}>{formatCurrency(c.fee.feeValue)}</span>{c.isEstimate && <span style={{fontSize:'.65rem',color:'var(--text3)',marginLeft:4}}>est.</span>}</>
                            : <span style={{color:'var(--text3)'}}>—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{fontWeight:700}}>TOTAL</td>
                      <td style={{fontWeight:700}}>{closedCamps.reduce((s,c)=>s+totalOrdered(c),0)}</td>
                      <td style={{fontWeight:700}}>{formatCurrency(closedVolume)}</td>
                      <td style={{fontWeight:700,color:'var(--primary)'}}>{formatCurrency(closedFee)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── ABA COBRANÇAS ── */}
      {tab === 'cobranca' && (() => {
        // Agrupa cotações encerradas por gestor
        const byGestor = {}
        closedCamps.forEach(c => {
          const gestor = gestors.find(p => p.id === c.pivoId)
          if (!gestor) return
          if (!byGestor[gestor.id]) byGestor[gestor.id] = { gestor, campaigns: [] }
          byGestor[gestor.id].campaigns.push(c)
        })
        const groups = Object.values(byGestor)
        const unpaidGroups = groups.map(g => ({
          ...g,
          unpaid: g.campaigns.filter(c => !c.feePaidAt),
          paid: g.campaigns.filter(c => c.feePaidAt),
        })).filter(g => g.campaigns.length > 0)

        const handleMarkPaid = async (group, adminName) => {
          setPaying(group.gestor.id)
          try {
            for (const c of group.campaigns) {
              await markFeePaid(c.id, adminName)
            }
            if (reload) await reload()
          } catch(e) {
            alert('Erro ao registrar pagamento: ' + e.message)
          } finally {
            setPaying(null)
            setConfirmBill(null)
          }
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {groups.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-muted text-center" style={{padding:'32px'}}>
                    Nenhuma cobrança pendente. Todas as cotações encerradas já foram processadas.
                  </p>
                </CardBody>
              </Card>
            ) : groups.map(group => {
              const unpaidCamps = group.campaigns.filter(c => !c.feePaidAt)
              const totalVol = unpaidCamps.reduce((s,c) => s + c.totalValue, 0)
              const totalTax = unpaidCamps.reduce((s,c) => s + c.fee.feeValue, 0)
              const paidTax = group.campaigns.filter(c => c.feePaidAt).reduce((s,c) => s + c.fee.feeValue, 0)
              const isPaying = paying === group.gestor.id
              const unpaid = group.campaigns.filter(c => !c.feePaidAt)
              const paid = group.campaigns.filter(c => c.feePaidAt)
              return (
                <Card key={group.gestor.id}>
                  <CardHeader>
                    <div style={{display:'flex', flexDirection:'column', gap:2}}>
                      <CardTitle>{group.gestor.name}</CardTitle>
                      <div style={{fontSize:'.75rem', color:'var(--text3)', display:'flex', gap:10}}>
                        {group.gestor.phone && <span><Phone size={10}/> {group.gestor.phone}</span>}
                        {group.gestor.city  && <span><MapPin size={10}/> {group.gestor.city}</span>}
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:10, flexShrink:0}}>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'.68rem', color:'var(--text3)', fontWeight:600, textTransform:'uppercase'}}>Taxa a cobrar</div>
                        <div style={{fontSize:'1.1rem', fontWeight:800, color:'var(--primary)'}}>{formatCurrency(totalTax)}</div>
                        <div style={{fontSize:'.72rem', color:'var(--text3)'}}>sobre {formatCurrency(totalVol)}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody noPad>
                    <div className={styles.tableWrap}>
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Cotação</th>
                            <th>Compradores</th>
                            <th>Volume</th>
                            <th>Taxa (1,5%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.campaigns.map((c,i) => (
                            <tr key={i} style={{opacity: c.feePaidAt ? .6 : 1}}>
                              <td style={{fontWeight:600}}>
                                {c.product}
                                {c.feePaidAt && (
                                  <span style={{marginLeft:8, fontSize:'.65rem', background:'var(--primary-dim)', color:'var(--primary)', borderRadius:99, padding:'1px 7px', fontWeight:600}}>
                                    ✓ Pago
                                  </span>
                                )}
                              </td>
                              <td style={{color:'var(--text2)'}}>{c.orders.length}</td>
                              <td>{c.totalValue > 0 ? formatCurrency(c.totalValue) : <span style={{color:'var(--text3)'}}>—</span>}</td>
                              <td>
                                <strong style={{color: c.feePaidAt ? 'var(--text3)' : 'var(--primary)'}}>
                                  {c.fee.feeValue > 0 ? formatCurrency(c.fee.feeValue) : '—'}
                                </strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={2} style={{fontWeight:700}}>TOTAL</td>
                            <td style={{fontWeight:700}}>{formatCurrency(totalVol)}</td>
                            <td style={{fontWeight:700, color:'var(--primary)'}}>{formatCurrency(totalTax)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div style={{padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:8}}>
                      {paidTax > 0 && (
                        <span style={{fontSize:'.78rem', color:'var(--primary)', fontWeight:600}}>
                          <CheckCircle size={12}/> {formatCurrency(paidTax)} já pago
                        </span>
                      )}
                      {unpaidCamps.length > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setConfirmBill({ gestorId: group.gestor.id, gestorName: group.gestor.name, group: {...group, campaigns: unpaidCamps} })}
                          disabled={isPaying}
                        >
                          <CreditCard size={13}/> {isPaying ? 'Registrando…' : `Marcar como pago (${formatCurrency(unpaidCamps.reduce((s,c)=>s+c.fee.feeValue,0))})`}
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )
            })}

            {/* Modal de confirmação de pagamento */}
            {confirmBill && (
              <div style={{
                position:'fixed', inset:0, background:'rgba(0,0,0,.4)',
                zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px',
              }} onClick={() => setConfirmBill(null)}>
                <div style={{
                  background:'var(--surface)', borderRadius:'var(--r-xl)',
                  padding:'24px', maxWidth:'420px', width:'100%',
                  boxShadow:'var(--shadow-lg)',
                }} onClick={e => e.stopPropagation()}>
                  <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
                    <AlertCircle size={20} style={{color:'var(--red)', flexShrink:0}}/>
                    <strong style={{fontSize:'.95rem'}}>Registrar pagamento recebido</strong>
                  </div>
                  <p style={{fontSize:'.85rem', color:'var(--text2)', lineHeight:1.6, marginBottom:16}}>
                    Confirme que <strong>{confirmBill.gestorName}</strong> efetuou o pagamento da taxa devida.<br/>
                    O pagamento ficará registrado no histórico com data e hora.
                  </p>
                  <div style={{background:'var(--primary-dim)', border:'1px solid var(--primary-border)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:'.82rem', color:'var(--primary)', marginBottom:16}}>
                    ✓ O registro permanece no sistema como comprovante.
                  </div>
                  <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                    <Button variant="outline" onClick={() => setConfirmBill(null)}>Cancelar</Button>
                    <Button
                      variant="outline"
                      style={{background:'var(--primary)', color:'#fff', borderColor:'var(--primary)'}}
                      onClick={() => handleMarkPaid(confirmBill.group, 'Admin')}
                    >
                      <CreditCard size={13}/> Confirmar pagamento recebido
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
