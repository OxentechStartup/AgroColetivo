export { formatCurrency } from './masks'

export const totalOrdered = (campaign) =>
  (campaign.orders ?? []).reduce((s, o) => s + o.qty, 0)

export const approvedCount = (campaign) =>
  (campaign.orders ?? []).length

export const freightPerProducer = (campaign) => {
  const n = approvedCount(campaign)
  if (!campaign.freightTotal || n === 0) return 0
  return campaign.freightTotal / n
}

export const markupPerProducer = (campaign) => {
  const n = approvedCount(campaign)
  if (!campaign.markupTotal || n === 0) return 0
  return campaign.markupTotal / n
}

// Taxa 1,5% dividida entre os produtores aprovados
export const feePerProducer = (campaign) => {
  const n = approvedCount(campaign)
  if (n === 0) return 0
  const total = (campaign.pricePerUnit ?? 0) * totalOrdered(campaign)
              + (campaign.freightTotal ?? 0)
              + (campaign.markupTotal  ?? 0)
  return (total * 0.015) / n
}

export const producerTotal = (order, campaign) => {
  const product = (campaign.pricePerUnit ?? 0) * order.qty
  const freight = freightPerProducer(campaign)
  const markup  = markupPerProducer(campaign)
  const fee     = feePerProducer(campaign)
  return product + freight + markup + fee
}

export const generateShareLink = () =>
  `${window.location.origin}/portalforms`

export const buildWhatsAppMsg = (campaign, vendor, opts = {}) => {
  const total    = totalOrdered(campaign)
  const totalTon = ((total * (campaign.unitWeight ?? 25)) / 1000).toFixed(2)
  const lines    = (campaign.orders ?? [])
    .map(o => `  • ${o.producerName}: ${o.qty} ${campaign.unit}`)
    .join('\n')
  const greeting = vendor ? `Olá, *${vendor.name}*! ` : ''

  // Condições da cotação
  const deadline  = opts.quotationDays  ? `${opts.quotationDays} dias` : '3 dias úteis'
  const payment   = opts.paymentTerms   || 'A combinar (boleto / PIX / prazo)'
  const freight   = opts.freightCondition || 'CIF – entrega no local combinado'
  const delivery  = opts.deliveryDays   ? `${opts.deliveryDays} dias após aprovação` : 'A combinar'

  return (
    `${greeting}*COTAÇÃO COLETIVA – ${campaign.product.toUpperCase()}*\n\n` +
    `📦 *Total: ${total} ${campaign.unit}* (${totalTon} toneladas)\n` +
    `👨‍🌾 Produtores: ${(campaign.orders ?? []).length}\n\n` +
    `*📋 Detalhamento de demanda:*\n${lines}\n\n` +
    `*⚙️ Condições da cotação:*\n` +
    `  💳 Pagamento: ${payment}\n` +
    `  🚚 Frete: ${freight}\n` +
    `  📅 Prazo de entrega: ${delivery}\n` +
    `  ⏰ Prazo para cotação: *${deadline}*\n\n` +
    `Favor enviar melhor preço por ${campaign.unit.replace(/s$/, '')} ` +
    `para entrega em Tabuleiro do Norte/CE.\n\n` +
    `Responda esta mensagem com: Preço/unidade + condições especiais.\n\nObrigado! 🌾`
  )
}

export const STATUS_LABEL = {
  open:        'Aberta',
  closed:      'Encerrada',
  negotiating: 'Negociando',
}

// ── MONETIZAÇÃO ──────────────────────────────────────────────────────────────
// Taxa de 1–2% sobre o valor total da transação
export const calcPlatformFee = (totalValue, feePercent = 1.5) => ({
  feePercent,
  feeValue: totalValue * (feePercent / 100),
  netValue:  totalValue * (1 - feePercent / 100),
})

export const campaignTotalValue = (campaign) => {
  if (!campaign.pricePerUnit) return 0
  return (campaign.pricePerUnit * totalOrdered(campaign))
    + (campaign.freightTotal ?? 0)
    + (campaign.markupTotal  ?? 0)
}

// ── Cálculo central de oferta — preço médio ponderado por prioridade ──────────
// Centralizado aqui para uso no Admin e Dashboard (antes só existia no LotsPanel)
export function calcSupplyStats(lots, orders, freightTotal, markupTotal, goalQty) {
  const totalOrdered_   = orders.reduce((s, o) => s + o.qty, 0)
  const totalAvailable  = lots.reduce((s, l) => s + l.qtyAvailable, 0)
  const numBuyers       = orders.length
  const demandTarget    = goalQty > 0 ? goalQty : totalOrdered_

  let remaining   = totalOrdered_
  let weightedSum = 0
  const lotBreakdown = lots.map(lot => {
    const used  = Math.min(lot.qtyAvailable, Math.max(0, remaining))
    remaining  -= used
    weightedSum += used * lot.pricePerUnit
    return { ...lot, used }
  })

  const totalSupplied = totalOrdered_ - remaining
  const avgPrice      = totalSupplied > 0 ? weightedSum / totalSupplied : 0
  const freightEach   = numBuyers > 0 ? (freightTotal ?? 0) / numBuyers : 0
  const markupEach    = numBuyers > 0 ? (markupTotal  ?? 0) / numBuyers : 0
  const totalGross    = weightedSum + (freightTotal ?? 0) + (markupTotal ?? 0)
  const feeTotal      = totalGross * 0.015
  const feeEach       = numBuyers > 0 && totalGross > 0 ? feeTotal / numBuyers : 0
  const isFulfilled   = totalAvailable >= demandTarget && demandTarget > 0

  return {
    totalAvailable, totalOrdered: totalOrdered_, totalSupplied, demandTarget,
    numBuyers, avgPrice, freightEach, markupEach,
    feeTotal, feeEach, totalGross,
    isFulfilled, lotBreakdown, weightedSum,
  }
}

// ── Valor real da cotação ─────────────────────────────────────────────────────
// Usa pricePerUnit (confirmado) quando disponível.
// Quando não há pricePerUnit (cotação aberta), estima a partir dos lotes.
export function campaignRealValue(campaign) {
  const lots   = campaign.lots   ?? []
  const orders = campaign.orders ?? []

  if (campaign.pricePerUnit) {
    return (campaign.pricePerUnit * totalOrdered(campaign))
      + (campaign.freightTotal ?? 0)
      + (campaign.markupTotal  ?? 0)
  }

  if (lots.length > 0 && orders.length > 0) {
    const stats = calcSupplyStats(lots, orders, campaign.freightTotal, campaign.markupTotal, campaign.goalQty)
    return stats.totalGross
  }

  return 0
}

// Retorna true quando o valor é estimado via lotes (sem pricePerUnit confirmado)
export function campaignValueIsEstimate(campaign) {
  return !campaign.pricePerUnit && (campaign.lots ?? []).length > 0 && (campaign.orders ?? []).length > 0
}
