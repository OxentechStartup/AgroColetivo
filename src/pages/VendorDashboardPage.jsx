import { useState } from 'react'
import { Package, Clock, CheckCircle, ChevronDown, ChevronUp, TrendingUp, DollarSign, Truck } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '../components/Card'
import { Badge }  from '../components/Badge'
import { totalOrdered, STATUS_LABEL } from '../utils/data'
import { formatCurrency, displayPhone } from '../utils/masks'
import styles from './VendorDashboardPage.module.css'

// Calcula o que o vendor vai receber nesta cotação com base nos próprios lotes
function calcVendorEarnings(campaign) {
  const lots = campaign.lots ?? []
  if (lots.length === 0) return null

  // Soma qtd × preço de cada lote do vendor
  const subtotal = lots.reduce((s, lot) => s + (lot.qtyAvailable * lot.pricePerUnit), 0)

  // Frete proporcional: se há freightTotal e totalOrdered, calcula a parte do vendor
  const totalQty   = campaign.totalOrdered ?? 0
  const myQty      = lots.reduce((s, l) => s + l.qtyAvailable, 0)
  const freightShare = totalQty > 0 && campaign.freightTotal > 0
    ? (myQty / totalQty) * campaign.freightTotal
    : 0

  return { subtotal, freightShare, total: subtotal + freightShare, myQty }
}

function buildWAInterestMsg(campaign, vendor) {
  const myQty = (campaign.lots ?? []).reduce((s, l) => s + l.qtyAvailable, 0)
  const hasLot = myQty > 0

  return (
    `Olá! Sou ${vendor?.name ?? 'fornecedor'} e tenho interesse na cotação de *${campaign.product.toUpperCase()}*.\n\n` +
    `📦 Produto: ${campaign.product}\n` +
    `📊 Demanda total: ${campaign.totalOrdered ?? 0} ${campaign.unit}\n` +
    (hasLot ? `✅ Minha oferta: ${myQty} ${campaign.unit}\n` : '') +
    `\nGostaria de participar desta cotação. Aguardo contato!`
  )
}

function EarningsBanner({ earnings, unit }) {
  if (!earnings) return null
  return (
    <div className={styles.earningsBanner}>
      <div className={styles.earningsRow}>
        <div className={styles.earningsItem}>
          <span className={styles.earningsLabel}>Subtotal produto</span>
          <span className={styles.earningsVal}>{formatCurrency(earnings.subtotal)}</span>
        </div>
        {earnings.freightShare > 0 && (
          <div className={styles.earningsItem}>
            <Truck size={11} style={{color:'var(--text3)', marginBottom:2}}/>
            <span className={styles.earningsLabel}>Frete estimado</span>
            <span className={styles.earningsVal}>{formatCurrency(earnings.freightShare)}</span>
          </div>
        )}
        <div className={`${styles.earningsItem} ${styles.earningsTotal}`}>
          <DollarSign size={11} style={{color:'var(--primary)', marginBottom:2}}/>
          <span className={styles.earningsLabel}>Total a receber</span>
          <span className={styles.earningsTotalVal}>{formatCurrency(earnings.total)}</span>
        </div>
      </div>
      <div className={styles.earningsQty}>
        {earnings.myQty} {unit} · {formatCurrency(earnings.subtotal / earnings.myQty)}/{unit.replace(/s$/, '')}
      </div>
    </div>
  )
}

function CampaignQuoteCard({ campaign, vendor }) {
  const [expanded, setExpanded] = useState(false)
  const ordered   = campaign.totalOrdered ?? 0
  const earnings  = calcVendorEarnings(campaign)
  const hasMyLot  = (campaign.lots ?? []).length > 0

  const waMsg  = buildWAInterestMsg(campaign, vendor)
  const pivoPhone = null // pivô não é exposto ao vendor — contato vai via WhatsApp do sistema
  const waUrl  = `https://wa.me/?text=${encodeURIComponent(waMsg)}`

  return (
    <div className={styles.quoteCard}>
      <div className={styles.quoteTop}>
        <div className={styles.quoteMain}>
          <div className={styles.quoteTitle}>{campaign.product}</div>
          <div className={styles.quoteMeta}>
            <Badge status={campaign.status}>{STATUS_LABEL[campaign.status]}</Badge>
            <span>{ordered} {campaign.unit} pedidos</span>
            {campaign.deadline && (
              <span className={styles.deadline}>
                Prazo: {campaign.deadline.split('-').reverse().join('/')}
              </span>
            )}
          </div>
        </div>
        <div className={styles.quoteActions}>
          {/* Destaque do total a receber no header do card */}
          {earnings && (
            <div className={styles.earningsChip}>
              <TrendingUp size={11}/>
              <span>{formatCurrency(earnings.total)}</span>
            </div>
          )}
          <button className={styles.expandBtn} onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className={styles.quoteDetail}>
          <div className={styles.detailGrid}>
            {[
              ['Meta',         `${campaign.goalQty} ${campaign.unit}`],
              ['Total pedido', `${ordered} ${campaign.unit}`],
              ['Peso/unidade', `${campaign.unitWeight ?? 25} kg`],
              ['Toneladas',    `${((ordered * (campaign.unitWeight ?? 25)) / 1000).toFixed(1)} t`],
            ].map(([l, v]) => (
              <div key={l} className={styles.detailItem}>
                <span className={styles.detailLabel}>{l}</span>
                <span className={styles.detailVal}>{v}</span>
              </div>
            ))}
          </div>

          {/* Lotes do vendor */}
          {hasMyLot && (
            <div className={styles.myLotBox}>
              <strong>Seu lote nesta cotação:</strong>
              {campaign.lots.map((lot, i) => (
                <div key={lot.id ?? i} className={styles.myLotRow}>
                  <span>{lot.qtyAvailable} {campaign.unit}</span>
                  <span>·</span>
                  <span>{formatCurrency(lot.pricePerUnit)}/{campaign.unit.replace(/s$/, '')}</span>
                  {lot.notes && <span className={styles.lotNotes}>{lot.notes}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Banner de ganhos */}
          <EarningsBanner earnings={earnings} unit={campaign.unit}/>

          <div className={styles.detailNote}>
            <Clock size={12}/> Entrega em Tabuleiro do Norte/CE
          </div>
        </div>
      )}
    </div>
  )
}

export function VendorDashboardPage({ campaigns, vendors, user }) {
  const vendor  = vendors.find(v => v.user_id === user?.id) ?? null
  const open    = campaigns.filter(c => c.status === 'open' || c.status === 'negotiating')
  const closed  = campaigns.filter(c => c.status === 'closed')

  // Total a receber considerando todos os lotes em cotações abertas
  const totalPotential = open.reduce((s, c) => {
    const e = calcVendorEarnings(c)
    return s + (e?.total ?? 0)
  }, 0)

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.heading}>
        <div>
          <h1>Cotações Disponíveis</h1>
          <p className="text-muted">Acompanhe cotações e visualize seus ganhos estimados</p>
        </div>
        {vendor && (
          <div className={styles.vendorInfo}>
            <span className={styles.vendorName}>{vendor.name}</span>
            {vendor.city && <span className={styles.vendorCity}>{vendor.city}</span>}
          </div>
        )}
      </div>

      {/* Resumo financeiro do vendor */}
      {totalPotential > 0 && (
        <div className={styles.summaryBar}>
          <TrendingUp size={15} style={{color:'var(--primary)'}}/>
          <span>
            Potencial de receita em cotações abertas:
            {' '}<strong style={{color:'var(--primary)'}}>{formatCurrency(totalPotential)}</strong>
          </span>
        </div>
      )}

      {/* ── Abertas ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            <CheckCircle size={15} style={{color:'var(--primary)'}}/> Em andamento
          </h2>
          <span className={styles.count}>{open.length}</span>
        </div>
        {open.length === 0 ? (
          <div className={styles.empty}>
            <Package size={28}/>
            <p>Nenhuma cotação aberta no momento.</p>
          </div>
        ) : (
          <div className={styles.quoteList}>
            {open.map(c => (
              <CampaignQuoteCard key={c.id} campaign={c} vendor={vendor}/>
            ))}
          </div>
        )}
      </div>

      {/* ── Finalizadas ── */}
      {closed.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <Clock size={15} style={{color:'var(--text3)'}}/> Finalizadas
            </h2>
            <span className={styles.count} style={{background:'var(--surface3)',color:'var(--text3)',border:'1px solid var(--border)'}}>
              {closed.length}
            </span>
          </div>
          <Card>
            <CardBody noPad>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd. pedida</th>
                    <th>Preço final</th>
                    <th>Seu lote</th>
                    <th>Recebido</th>
                  </tr>
                </thead>
                <tbody>
                  {closed.map((c, i) => {
                    const earnings = calcVendorEarnings(c)
                    const myQty    = earnings?.myQty ?? 0
                    return (
                      <tr key={i}>
                        <td style={{fontWeight:600}}>{c.product}</td>
                        <td style={{color:'var(--text2)'}}>{c.totalOrdered ?? 0} {c.unit}</td>
                        <td>
                          {c.pricePerUnit
                            ? formatCurrency(c.pricePerUnit) + '/' + c.unit.replace(/s$/, '')
                            : <span style={{color:'var(--text3)'}}>—</span>}
                        </td>
                        <td style={{color:'var(--text2)'}}>
                          {myQty > 0 ? `${myQty} ${c.unit}` : <span style={{color:'var(--text3)'}}>—</span>}
                        </td>
                        <td>
                          {earnings
                            ? <strong style={{color:'var(--primary)'}}>{formatCurrency(earnings.total)}</strong>
                            : <span style={{color:'var(--text3)'}}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

