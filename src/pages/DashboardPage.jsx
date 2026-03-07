import { TrendingUp, Package, Users, CheckCircle, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { totalOrdered, STATUS_LABEL } from '../utils/data'
import { formatCurrency } from '../utils/masks'
import styles from './DashboardPage.module.css'

function BarChart({ campaigns }) {
  const max = Math.max(...campaigns.map(c => c.orders.length), 1)
  const colors = {
    open:        'var(--green)',
    negotiating: 'var(--amber)',
    closed:      'var(--text3)',
  }
  return (
    <div className={styles.chart}>
      {campaigns.map(c => {
        const pct = (c.orders.length / max) * 100
        return (
          <div key={c.id} className={styles.barGroup}>
            <div className={styles.barTrack}>
              <div
                className={styles.bar}
                style={{ height:`${Math.max(4, pct)}%`, background: colors[c.status] ?? colors.open }}
              >
                {c.orders.length > 0 && <span className={styles.barVal}>{c.orders.length}</span>}
              </div>
            </div>
            <span className={styles.barLabel}>
              {c.product.length > 14 ? c.product.slice(0,12) + '…' : c.product}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`${styles.stat} ${accent ? styles[`stat_${accent}`] : ''}`}>
      <div className={styles.statIcon}><Icon size={18} /></div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

export function DashboardPage({ campaigns, setPage }) {
  const open     = campaigns.filter(c => c.status === 'open').length
  const closed   = campaigns.filter(c => c.status === 'closed').length
  const producers = new Set(campaigns.flatMap(c => c.orders.map(o => o.producerName))).size
  const pending   = campaigns.reduce((s,c) => s + (c.pendingOrders?.length ?? 0), 0)
  const openCampaigns = campaigns.filter(c => c.status === 'open')

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.heading}>
        <h1>Dashboard</h1>
        <p className="text-muted">Visão geral das compras coletivas</p>
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon={Package}     label="Cotações Abertas" value={open}      sub={`${campaigns.length} total`} accent="amber" />
        <StatCard icon={CheckCircle} label="Finalizadas"      value={closed}    sub="cotações encerradas"         accent="green" />
        <StatCard icon={Users}       label="Produtores"       value={producers} sub="com pedidos aprovados"       accent="blue"  />
        <StatCard icon={Clock}       label="Pendentes"        value={pending}   sub="aguardando aprovação"        accent={pending > 0 ? 'red' : ''} />
      </div>

      <div className={styles.row}>
        <Card>
          <CardHeader>
            <CardTitle>Produtores por Cotação</CardTitle>
            <div className={styles.legend}>
              {[
                ['var(--green)','Aberta'],
                ['var(--amber)','Negociando'],
                ['var(--text3)','Encerrada'],
              ].map(([c,l]) => (
                <span key={l} className={styles.legendDot}>
                  <span style={{background:c,width:7,height:7,borderRadius:'50%',display:'inline-block'}}/>
                  {l}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardBody>
            {campaigns.length === 0
              ? <p className="text-muted text-center" style={{padding:'32px 0'}}>Sem dados ainda.</p>
              : <BarChart campaigns={campaigns} />
            }
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Em Andamento</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setPage('campaigns')}>
              Ver todas <TrendingUp size={13} />
            </Button>
          </CardHeader>
          <CardBody noPad>
            {openCampaigns.length === 0 ? (
              <div className={styles.empty}>
                <Package size={28} />
                <p>Nenhuma cotação aberta.</p>
              </div>
            ) : (
              openCampaigns.map((c, i) => (
                <div
                  key={c.id}
                  className={`${styles.campaignRow} ${i < openCampaigns.length-1 ? styles.rowBorder : ''}`}
                >
                  <div className={styles.rowTop}>
                    <span className={styles.rowName}>{c.product}</span>
                    <Badge status={c.status}>{STATUS_LABEL[c.status]}</Badge>
                  </div>
                  <ProgressBar value={totalOrdered(c)} goal={c.goalQty} unit={c.unit} compact />
                  <div className={styles.rowMeta}>
                    <span>{c.orders.length} produtores</span>
                    {c.pricePerUnit && <span>{formatCurrency(c.pricePerUnit)}/{c.unit.replace(/s$/,'')}</span>}
                    {(c.pendingOrders?.length ?? 0) > 0 && (
                      <span style={{color:'var(--red)'}}>
                        {c.pendingOrders.length} pendente(s)
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
