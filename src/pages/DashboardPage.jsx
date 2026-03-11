import {
  TrendingUp, Package, Users, CheckCircle, Clock,
  DollarSign, BarChart2, AlertTriangle, Zap, Target,
  ArrowRight, Leaf, Activity,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { totalOrdered, STATUS_LABEL, campaignRealValue, calcPlatformFee } from '../utils/data'
import { formatCurrency } from '../utils/masks'
import styles from './DashboardPage.module.css'

// ── Gráfico de barras ──────────────────────────────────────────
function BarChart({ campaigns }) {
  const max = Math.max(...campaigns.map(c => c.orders.length), 1)
  const colors = { open: 'var(--primary)', negotiating: 'var(--amber)', closed: 'var(--text3)' }
  return (
    <div className={styles.chart}>
      {campaigns.map(c => {
        const pct = (c.orders.length / max) * 100
        return (
          <div key={c.id} className={styles.barGroup}>
            <div className={styles.barTrack}>
              <div className={styles.bar}
                style={{ height: `${Math.max(4, pct)}%`, background: colors[c.status] ?? colors.open }}>
                {c.orders.length > 0 && <span className={styles.barVal}>{c.orders.length}</span>}
              </div>
            </div>
            <span className={styles.barLabel}>
              {c.product.length > 14 ? c.product.slice(0, 12) + '…' : c.product}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Card de stat clicável ──────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, onClick }) {
  return (
    <div
      className={`${styles.stat} ${accent ? styles[`stat_${accent}`] : ''} ${onClick ? styles.statClickable : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className={styles.statIcon}><Icon size={18}/></div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

// ── Linha de cotação em andamento ──────────────────────────────
function CampaignRow({ c, isLast }) {
  const ord = totalOrdered(c)
  const pct = c.goalQty > 0 ? Math.min(100, Math.round(ord / c.goalQty * 100)) : 0
  return (
    <div className={`${styles.campaignRow} ${!isLast ? styles.rowBorder : ''}`}>
      <div className={styles.rowTop}>
        <span className={styles.rowName}>{c.product}</span>
        <Badge status={c.status}>{STATUS_LABEL[c.status]}</Badge>
      </div>
      <ProgressBar value={ord} goal={c.goalQty} unit={c.unit} compact/>
      <div className={styles.rowMeta}>
        <span>{c.orders.length} produtor{c.orders.length !== 1 ? 'es' : ''}</span>
        {c.pricePerUnit && <span>{formatCurrency(c.pricePerUnit)}/{c.unit.replace(/s$/, '')}</span>}
        <span style={{ color: pct >= 100 ? 'var(--primary)' : 'var(--text3)' }}>{pct}% da meta</span>
        {(c.pendingOrders?.length ?? 0) > 0 && (
          <span style={{ color: 'var(--red)', fontWeight: 600 }}>
            {c.pendingOrders.length} pendente{c.pendingOrders.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Linha de alerta ────────────────────────────────────────────
function AlertRow({ icon: Icon, text, color, cta, onCta }) {
  return (
    <div className={styles.alertRow} style={{ borderLeftColor: color }}>
      <Icon size={14} style={{ color, flexShrink: 0 }}/>
      <span className={styles.alertText}>{text}</span>
      {cta && (
        <button className={styles.alertCta} onClick={onCta}>
          {cta} <ArrowRight size={11}/>
        </button>
      )}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────
const fmtDate = iso => iso ? iso.split('-').reverse().join('/') : ''

export function DashboardPage({ campaigns, setPage, user }) {
  const open    = campaigns.filter(c => c.status === 'open')
  const closed  = campaigns.filter(c => c.status === 'closed')
  const negot   = campaigns.filter(c => c.status === 'negotiating')
  const pending = campaigns.reduce((s, c) => s + (c.pendingOrders?.length ?? 0), 0)

  const allProducers    = new Set(campaigns.flatMap(c => c.orders.map(o => o.producerName)))
  const totalProducers  = allProducers.size
  const totalOrders     = campaigns.reduce((s, c) => s + c.orders.length, 0)
  const totalTons       = campaigns.reduce((s, c) =>
    s + c.orders.reduce((ss, o) => ss + (o.qty * (c.unitWeight ?? 25)) / 1000, 0), 0)

  // Financeiro
  const totalTransacted = campaigns
    .filter(c => c.status === 'closed' || c.status === 'negotiating')
    .reduce((s, c) => s + campaignRealValue(c), 0)
  const { feeValue } = calcPlatformFee(totalTransacted, 1.5)

  // Alertas inteligentes
  const alerts = []
  if (pending > 0)
    alerts.push({ icon: Clock,         text: `${pending} pedido(s) aguardando aprovação`,            color: 'var(--amber)', cta: 'Aprovar',   page: 'campaigns' })
  const nearGoal = open.filter(c => { const o = totalOrdered(c); return c.goalQty > 0 && o / c.goalQty >= 0.8 && o < c.goalQty })
  if (nearGoal.length > 0)
    alerts.push({ icon: Target,        text: `${nearGoal.length} cotação(ões) acima de 80% da meta`, color: 'var(--primary)' })
  const noVendors = open.filter(c => (c.lots?.length ?? 0) === 0 && c.orders.length > 0)
  if (noVendors.length > 0)
    alerts.push({ icon: AlertTriangle, text: `${noVendors.length} cotação(ões) sem fornecedor`,      color: 'var(--red)',   cta: 'Corrigir',  page: 'campaigns' })
  const expiring = open.filter(c => {
    if (!c.deadline) return false
    const days = (new Date(c.deadline) - new Date()) / 86400000
    return days >= 0 && days <= 3
  })
  if (expiring.length > 0)
    alerts.push({ icon: Activity,      text: `${expiring.length} cotação(ões) vencem em ≤ 3 dias`,   color: 'var(--red)',   cta: 'Ver',       page: 'campaigns' })

  // Top produtores
  const prodMap = {}
  campaigns.forEach(c => {
    c.orders.forEach(o => {
      if (!prodMap[o.producerName]) prodMap[o.producerName] = { name: o.producerName, campanhas: 0, total: 0 }
      prodMap[o.producerName].campanhas++
      prodMap[o.producerName].total += o.qty
    })
  })
  const topProd = Object.values(prodMap).sort((a, b) => b.campanhas - a.campanhas).slice(0, 5)

  // Cotações encerradas recentes
  const recentClosed = [...closed].reverse().slice(0, 5)

  const isEmpty = campaigns.length === 0

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.heading}>
        <h1>Dashboard</h1>
        <p className="text-muted">Visão geral das compras coletivas</p>
      </div>

      {user?.blocked && (
        <div className={styles.blockedBanner}>
          <span className={styles.blockedIcon}>🔒</span>
          <div>
            <strong>Conta bloqueada</strong>
            <p>Seu acesso está restrito ao Dashboard. Contate o administrador para reativar sua conta.</p>
            <p className={styles.blockedPendencia}>⚠️ Você pode ter alguma pendência.</p>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className={styles.statsGrid}>
        <StatCard icon={Package}     label="Cotações Abertas" value={open.length}      sub={`${negot.length} negociando · ${campaigns.length} total`} accent="amber" onClick={() => setPage('campaigns')}/>
        <StatCard icon={CheckCircle} label="Finalizadas"      value={closed.length}    sub={`${recentClosed.length > 0 ? formatCurrency(closed.reduce((s,c)=>s+campaignRealValue(c),0)) : '—'} negociado`} accent="green"/>
        <StatCard icon={Users}       label="Produtores"       value={totalProducers}   sub={`${totalOrders} pedidos · ${totalTons.toFixed(1)} t`} accent="blue" onClick={() => setPage('producers')}/>
        <StatCard icon={Clock}       label="Pendentes"        value={pending}          sub="aguardando aprovação" accent={pending > 0 ? 'red' : ''} onClick={pending > 0 ? () => setPage('campaigns') : undefined}/>
      </div>

      {/* ── Taxa plataforma ── */}
      {totalTransacted > 0 && (
        <div className={styles.feeBar}>
          <DollarSign size={14}/>
          <span>
            Volume negociado: <strong>{formatCurrency(totalTransacted)}</strong>
            {' '}· Taxa da plataforma (1,5%): <strong style={{ color: 'var(--primary)' }}>{formatCurrency(feeValue)}</strong>
          </span>
        </div>
      )}

      {/* ── Alertas ── */}
      {alerts.length > 0 && (
        <div className={styles.alertsBox}>
          <div className={styles.alertsTitle}><Zap size={13}/> Atenção necessária</div>
          {alerts.map((a, i) => (
            <AlertRow key={i} icon={a.icon} text={a.text} color={a.color}
              cta={a.cta} onCta={a.page ? () => setPage(a.page) : undefined}/>
          ))}
        </div>
      )}

      {/* ── Estado vazio ── */}
      {isEmpty && (
        <div className={styles.emptyState}>
          <Leaf size={36} style={{ color: 'var(--primary)', opacity: .5 }}/>
          <h3>Bem-vindo ao AgroColetivo</h3>
          <p>Crie sua primeira cotação coletiva para começar.</p>
          <Button variant="primary" onClick={() => setPage('campaigns')}>
            Criar cotação <ArrowRight size={14}/>
          </Button>
        </div>
      )}

      {/* ── Gráfico + Em andamento ── */}
      {!isEmpty && (
        <div className={styles.row}>
          <Card>
            <CardHeader>
              <CardTitle>Produtores por Cotação</CardTitle>
              <div className={styles.legend}>
                {[['var(--primary)', 'Aberta'], ['var(--amber)', 'Negociando'], ['var(--text3)', 'Encerrada']].map(([c, l]) => (
                  <span key={l} className={styles.legendDot}>
                    <span style={{ background: c, width: 7, height: 7, borderRadius: '50%', display: 'inline-block' }}/>
                    {l}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardBody>
              <BarChart campaigns={campaigns}/>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Em Andamento</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setPage('campaigns')}>
                Ver todas <TrendingUp size={13}/>
              </Button>
            </CardHeader>
            <CardBody noPad>
              {open.length === 0
                ? <div className={styles.empty}><Package size={28}/><p>Nenhuma cotação aberta.</p></div>
                : open.map((c, i) => <CampaignRow key={c.id} c={c} isLast={i === open.length - 1}/>)
              }
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Top Produtores + Histórico ── */}
      {!isEmpty && (topProd.length > 0 || recentClosed.length > 0) && (
        <div className={styles.row}>
          {topProd.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><Users size={13}/> Top Produtores</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setPage('producers')}>
                  Ver todos <ArrowRight size={13}/>
                </Button>
              </CardHeader>
              <CardBody noPad>
                {topProd.map((p, i) => (
                  <div key={p.name} className={`${styles.topRow} ${i < topProd.length - 1 ? styles.rowBorder : ''}`}>
                    <div className={styles.topRank}>{i + 1}</div>
                    <div className={styles.topName}>{p.name}</div>
                    <div className={styles.topMeta}>
                      <span>{p.campanhas} cotação{p.campanhas !== 1 ? 'ões' : ''}</span>
                      <span className={styles.topQty}>{p.total} un.</span>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {recentClosed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><BarChart2 size={13}/> Histórico Recente</CardTitle>
                <span style={{ fontSize: '.78rem', color: 'var(--text3)' }}>{closed.length} encerrada{closed.length !== 1 ? 's' : ''}</span>
              </CardHeader>
              <CardBody noPad>
                <table className="tbl">
                  <thead>
                    <tr><th>Produto</th><th>Produtores</th><th>Valor total</th></tr>
                  </thead>
                  <tbody>
                    {recentClosed.map((c, i) => {
                      const val = campaignRealValue(c)
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{c.product}</td>
                          <td style={{ color: 'var(--text2)' }}>{c.orders.length}</td>
                          <td>
                            {val > 0
                              ? <strong style={{ color: 'var(--primary)' }}>{formatCurrency(val)}</strong>
                              : <span style={{ color: 'var(--text3)' }}>—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
