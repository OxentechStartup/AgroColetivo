import { useState } from 'react'
import { Phone, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '../components/Badge'
import { calcSupplyStats } from '../components/LotsPanel'
import { STATUS_LABEL } from '../utils/data'
import { formatCurrency, displayPhone } from '../utils/masks'
import styles from './ProducersPage.module.css'

// ── Linha expandível (mobile) ──
function MobileCard({ r }) {
  const [open, setOpen] = useState(false)
  const extras = r.freight + r.markup

  return (
    <div className={styles.card}>
      <button className={styles.cardBtn} onClick={() => setOpen(o => !o)}>
        <div className={styles.cardLeft}>
          <div className={styles.pName}>{r.producerName}</div>
          <div className={styles.pPhone}><Phone size={10}/> {displayPhone(r.phone)}</div>
        </div>
        <div className={styles.cardRight}>
          <div className={styles.totalVal}>{r.hasPrice ? formatCurrency(r.total) : '—'}</div>
          <div className={styles.cardMeta2}>{r.qty} {r.unit} · {r.campaign}</div>
        </div>
        {open ? <ChevronUp size={14} color="var(--text3)"/> : <ChevronDown size={14} color="var(--text3)"/>}
      </button>

      {open && (
        <div className={styles.cardBody}>
          <div className={styles.detailRow}>
            <span>Cotação</span>
            <span><Badge status={r.campaignStatus}>{STATUS_LABEL[r.campaignStatus]}</Badge> {r.campaign}</span>
          </div>
          <div className={styles.detailRow}>
            <span>Quantidade</span>
            <span>{r.qty} {r.unit} ({r.tons} t)</span>
          </div>
          {r.hasPrice && <>
            <div className={styles.detailRow}>
              <span>Produto (preço médio)</span>
              <span>{formatCurrency(r.produto)}</span>
            </div>
            {extras > 0 && (
              <div className={styles.detailRow}>
                <span>Frete + Markup</span>
                <span>{formatCurrency(extras)}</span>
              </div>
            )}
            <div className={`${styles.detailRow} ${styles.detailTotal}`}>
              <span>Total a pagar</span>
              <span>{formatCurrency(r.total)}</span>
            </div>
          </>}
        </div>
      )}
    </div>
  )
}

export function ProducersPage({ campaigns }) {
  // ── Monta rows com cálculo correto por campanha ──
  const rows = campaigns.flatMap(c => {
    // calcSupplyStats: distribui fornecedores por prioridade → preço médio ponderado
    const stats = calcSupplyStats(
      c.lots   ?? [],
      c.orders ?? [],
      c.freightTotal,
      c.markupTotal
    )
    return (c.orders ?? []).map(o => ({
      ...o,
      campaign:       c.product,
      campaignStatus: c.status,
      unit:           c.unit,
      // toneladas = qtd × peso unitário (padrão 25 kg/saco) ÷ 1000
      tons:    ((o.qty * (c.unitWeight ?? 25)) / 1000).toFixed(2),
      // produto  = preço médio × quantidade do produtor
      produto: stats.avgPrice * o.qty,
      // extras   = frete ÷ nBuyers + markup ÷ nBuyers
      freight: stats.freightEach,
      markup:  stats.markupEach,
      // total    = produto + frete/comprador + markup/comprador
      total:   stats.avgPrice * o.qty + stats.freightEach + stats.markupEach,
      hasPrice: stats.avgPrice > 0,
    }))
  })

  const unique = new Set(rows.map(r => r.producerName)).size

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.heading}>
        <h1 className={styles.pageTitle}>Produtores</h1>
        <p className="text-muted">{unique} produtor{unique !== 1 ? 'es' : ''} com pedidos aprovados</p>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>Nenhum produtor registrou pedidos ainda.</div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className="tbl">
                <thead><tr>
                  <th>Produtor</th>
                  <th>Cotação</th>
                  <th>Qtd</th>
                  <th>Ton.</th>
                  <th>Produto</th>
                  <th>Frete + Markup</th>
                  <th>Total</th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{fontWeight:700}}>{r.producerName}</div>
                        <div style={{display:'flex',alignItems:'center',gap:3,color:'var(--text3)',fontSize:'.7rem',marginTop:2}}>
                          <Phone size={10}/> {displayPhone(r.phone)}
                        </div>
                      </td>
                      <td><Badge status={r.campaignStatus}>{r.campaign}</Badge></td>
                      <td style={{whiteSpace:'nowrap'}}>{r.qty} {r.unit}</td>
                      <td style={{color:'var(--text2)'}}>{r.tons} t</td>
                      <td>{r.hasPrice ? formatCurrency(r.produto) : <span style={{color:'var(--text3)'}}>—</span>}</td>
                      <td style={{color:'var(--text2)'}}>
                        {(r.freight + r.markup) > 0 ? formatCurrency(r.freight + r.markup) : <span style={{color:'var(--text3)'}}>—</span>}
                      </td>
                      <td>
                        {r.hasPrice
                          ? <strong style={{color:'var(--green)'}}>{formatCurrency(r.total)}</strong>
                          : <span style={{color:'var(--text3)'}}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: cards expandíveis */}
          <div className={styles.cards}>
            {rows.map((r, i) => <MobileCard key={i} r={r} />)}
          </div>
        </>
      )}
    </div>
  )
}
