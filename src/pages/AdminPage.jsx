import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, TrendingUp, Package, Users, Activity, BarChart2,
  CheckCircle, Clock, ShieldOff, Shield, Phone, MapPin,
  ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Search,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '../components/Card'
import { Badge } from '../components/Badge'
import { totalOrdered, campaignRealValue, campaignValueIsEstimate, calcPlatformFee, STATUS_LABEL } from '../utils/data'
import { formatCurrency } from '../utils/masks'
import { fetchPivosAdmin, setPivoActive } from '../lib/auth'
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

function PivoRow({ pivo, campaigns, onToggle, toggling }) {
  const [expanded, setExpanded] = useState(false)
  const pivoCampaigns = campaigns.filter(c => c.pivoId === pivo.id)
  const totalFee = pivoCampaigns.reduce((s, c) => s + calcPlatformFee(campaignRealValue(c), 1.5).feeValue, 0)
  const isBlocked = !pivo.active

  return (
    <div className={`${styles.pivoCard} ${isBlocked ? styles.pivoBlocked : ''}`}>
      <div className={styles.pivoRow}>
        <div className={`${styles.pivoStatusDot} ${isBlocked ? styles.dotBlocked : styles.dotActive}`}/>
        <div className={styles.pivoInfo}>
          <div className={styles.pivoName}>{pivo.name}</div>
          <div className={styles.pivoMeta}>
            <span><Phone size={10}/> {fmtPhone(pivo.phone)}</span>
            {pivo.city && <span><MapPin size={10}/> {pivo.city}</span>}
            <span>desde {fmtDate(pivo.created_at)}</span>
          </div>
        </div>
        <div className={styles.pivoStats}>
          <div className={styles.pivoStat}>
            <span className={styles.pivoStatVal}>{pivoCampaigns.length}</span>
            <span className={styles.pivoStatLbl}>cotações</span>
          </div>
          <div className={styles.pivoStat}>
            <span className={styles.pivoStatVal} style={{color:'var(--primary)'}}>{formatCurrency(totalFee)}</span>
            <span className={styles.pivoStatLbl}>taxa gerada</span>
          </div>
        </div>
        <div className={styles.pivoActions}>
          <button
            className={`${styles.toggleBtn} ${isBlocked ? styles.unblockBtn : styles.blockBtn}`}
            onClick={() => onToggle(pivo.id, isBlocked)}
            disabled={toggling === pivo.id}
          >
            {toggling === pivo.id
              ? <RefreshCw size={13} className={styles.spin}/>
              : isBlocked
                ? <><Shield size={13}/> Desbloquear</>
                : <><ShieldOff size={13}/> Bloquear</>}
          </button>
          {pivoCampaigns.length > 0 && (
            <button className={styles.expandPivoBtn} onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className={styles.pivoCampaigns}>
          {pivoCampaigns.map((c, i) => {
            const fee = calcPlatformFee(campaignRealValue(c), 1.5).feeValue
            const isEst = campaignValueIsEstimate(c)
            const ordered = totalOrdered(c)
            const pct = c.goalQty > 0 ? Math.min(100, Math.round((ordered / c.goalQty) * 100)) : 0
            return (
              <div key={i} className={styles.pivoCampRow}>
                <div className={styles.pivoCampLeft}>
                  <Badge status={c.status}>{STATUS_LABEL[c.status]}</Badge>
                  <span className={styles.pivoCampName}>{c.product}</span>
                </div>
                <div className={styles.pivoCampMid}>
                  <MiniBar value={ordered} max={c.goalQty}/>
                  <span className={styles.pivoCampPct}>{pct}%</span>
                </div>
                <span className={styles.pivoCampFee}>
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
          Acesso bloqueado — este pivô não consegue fazer login
        </div>
      )}
    </div>
  )
}

export function AdminPage({ campaigns }) {
  const [tab,      setTab]      = useState('dashboard')
  const [pivos,    setPivos]    = useState([])
  const [pivoLoad, setPivoLoad] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [search,   setSearch]   = useState('')

  const loadPivos = useCallback(async () => {
    setPivoLoad(true)
    try { setPivos(await fetchPivosAdmin()) }
    catch (e) { console.error(e) }
    finally { setPivoLoad(false) }
  }, [])

  useEffect(() => { loadPivos() }, [loadPivos])

  const [toggleError, setToggleError] = useState(null)

  const handleToggle = async (userId, newActive) => {
    setToggling(userId)
    setToggleError(null)
    try {
      await setPivoActive(userId, newActive)
      // Recarrega do banco para confirmar valor real
      await loadPivos()
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
  const closedCamps    = allValues.filter(c => c.status === 'closed')
  const openCamps      = allValues.filter(c => c.status === 'open' || c.status === 'negotiating')
  const totalVolume    = allValues.reduce((s, c) => s + c.totalValue, 0)
  const totalFee       = allValues.reduce((s, c) => s + c.fee.feeValue, 0)
  const closedFee      = closedCamps.reduce((s, c) => s + c.fee.feeValue, 0)
  const projectedFee   = openCamps.reduce((s, c) => s + c.fee.feeValue, 0)
  const closedVolume   = closedCamps.reduce((s, c) => s + c.totalValue, 0)
  const uniqueProducers = new Set(campaigns.flatMap(c => c.orders.map(o => o.producerName))).size
  const uniqueVendors   = new Set(campaigns.flatMap(c => (c.lots ?? []).map(l => l.vendorName))).size
  const totalOrders_n   = campaigns.reduce((s, c) => s + c.orders.length + (c.pendingOrders?.length ?? 0), 0)

  const blockedPivos   = pivos.filter(p => !p.active)
  const filteredPivos  = pivos.filter(p =>
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
        <button className={`${styles.tab} ${tab === 'pivos' ? styles.tabOn : ''}`} onClick={() => setTab('pivos')}>
          <Users size={14}/> Pivôs
          {blockedPivos.length > 0 && <span className={styles.alertDot}>{blockedPivos.length}</span>}
        </button>
        <button className={`${styles.tab} ${tab === 'cotacoes' ? styles.tabOn : ''}`} onClick={() => setTab('cotacoes')}>
          <Package size={14}/> Cotações
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
            { icon: Users,       color: 'var(--text3)',   val: `${pivos.filter(p=>p.active).length} / ${pivos.length}`, lbl: 'Pivôs ativos' },
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

        {pivos.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Receita por Pivô</CardTitle></CardHeader>
            <CardBody noPad>
              <div className={styles.tableWrap}>
                <table className="tbl">
                  <thead>
                    <tr><th>Pivô</th><th>Cotações</th><th>Volume</th><th>Taxa</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {pivos.map(p => {
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
                  <thead><tr><th>Produto</th><th>Pivô</th><th>Produtores</th><th>Progresso</th><th>Taxa Est.</th></tr></thead>
                  <tbody>
                    {openCamps.map((c, i) => {
                      const ord = totalOrdered(c)
                      const pct = c.goalQty > 0 ? Math.round((ord / c.goalQty) * 100) : 0
                      const pivo = pivos.find(p => p.id === c.pivoId)
                      return (
                        <tr key={i}>
                          <td style={{fontWeight:600}}>{c.product}</td>
                          <td style={{fontSize:'.8rem',color:'var(--text2)'}}>{pivo?.name ?? '—'}</td>
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
      {tab === 'pivos' && (
        <div className={styles.pivosSection}>
          <div className={styles.pivosHeader}>
            <div className={styles.pivosQuickStats}>
              <div className={styles.qStat}><span style={{color:'var(--primary)'}}>{pivos.filter(p=>p.active).length}</span> ativos</div>
              <div className={styles.qStatDiv}/>
              <div className={styles.qStat}><span style={{color:'var(--red)'}}>{blockedPivos.length}</span> bloqueados</div>
            </div>
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon}/>
              <input className={styles.searchInput} placeholder="Buscar pivô…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>

          {toggleError && (
            <div className={styles.alertBanner} style={{background:'var(--red-dim)',borderColor:'var(--red-border)',color:'var(--red)'}}>
              <AlertTriangle size={13}/> {toggleError}
            </div>
          )}

          {blockedPivos.length > 0 && !search && (
            <div className={styles.alertBanner}>
              <AlertTriangle size={13}/>
              {blockedPivos.length} pivô{blockedPivos.length > 1 ? 's' : ''} com acesso bloqueado. Clique em "Desbloquear" para restaurar o acesso.
            </div>
          )}

          {pivoLoad ? (
            <div className={styles.pivoLoading}>Carregando pivôs…</div>
          ) : filteredPivos.length === 0 ? (
            <div className={styles.pivoEmpty}>{search ? 'Nenhum resultado.' : 'Nenhum pivô cadastrado.'}</div>
          ) : (
            <div className={styles.pivoList}>
              {filteredPivos.map(p => (
                <PivoRow key={p.id} pivo={p} campaigns={campaigns} onToggle={handleToggle} toggling={toggling}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COTAÇÕES ── */}
      {tab === 'cotacoes' && (
        <Card>
          <CardHeader>
            <CardTitle>Todas as Cotações</CardTitle>
            <span style={{fontSize:'.78rem',color:'var(--text3)'}}>Realizado: <strong style={{color:'var(--primary)'}}>{formatCurrency(closedFee)}</strong></span>
          </CardHeader>
          <CardBody noPad>
            {campaigns.length === 0 ? (
              <p className="text-muted text-center" style={{padding:'32px'}}>Sem cotações ainda.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className="tbl">
                  <thead>
                    <tr><th>Produto</th><th>Pivô</th><th>Status</th><th>Produtores</th><th>Qtd</th><th>Valor Bruto</th><th>Taxa (1,5%)</th></tr>
                  </thead>
                  <tbody>
                    {allValues.map((c, i) => {
                      const pivo = pivos.find(p => p.id === c.pivoId)
                      return (
                        <tr key={i}>
                          <td><div style={{fontWeight:600}}>{c.product}</div>{c.deadline && <div style={{fontSize:'.7rem',color:'var(--text3)'}}>Prazo: {fmtDate(c.deadline)}</div>}</td>
                          <td style={{fontSize:'.8rem',color:'var(--text2)'}}>{pivo?.name ?? '—'}</td>
                          <td><Badge status={c.status}>{STATUS_LABEL[c.status]}</Badge></td>
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
                      <td colSpan={5} style={{fontWeight:700}}>TOTAL</td>
                      <td style={{fontWeight:700}}>{formatCurrency(totalVolume)}</td>
                      <td style={{fontWeight:700,color:'var(--primary)'}}>{formatCurrency(totalFee)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
