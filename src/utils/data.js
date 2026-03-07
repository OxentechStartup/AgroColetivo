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

export const producerTotal = (order, campaign) => {
  const product = (campaign.pricePerUnit ?? 0) * order.qty
  const freight = freightPerProducer(campaign)
  const markup  = markupPerProducer(campaign)
  return product + freight + markup
}

export const generateShareLink = () =>
  `${window.location.origin}/portalforms`

export const buildWhatsAppMsg = (campaign, vendor) => {
  const total    = totalOrdered(campaign)
  const totalTon = ((total * (campaign.unitWeight ?? 25)) / 1000).toFixed(2)
  const lines    = (campaign.orders ?? [])
    .map(o => `  • ${o.producerName}: ${o.qty} ${campaign.unit}`)
    .join('\n')
  const greeting = vendor ? `Olá, *${vendor.name}*! ` : ''
  return (
    `${greeting}*COTAÇÃO COLETIVA – ${campaign.product.toUpperCase()}*\n\n` +
    `Total: *${total} ${campaign.unit}* (${totalTon} toneladas)\n` +
    `Produtores: ${(campaign.orders ?? []).length}\n\n` +
    `*Detalhamento:*\n${lines}\n\n` +
    `Favor enviar melhor preço por ${campaign.unit.replace(/s$/, '')} ` +
    `para entrega em Tabuleiro do Norte/CE.\n\nObrigado!`
  )
}

export const STATUS_LABEL = {
  open:        'Aberta',
  closed:      'Encerrada',
  negotiating: 'Negociando',
}
