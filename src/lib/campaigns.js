import { supabase } from './supabase'

// ── CAMPAIGNS ─────────────────────────────────────────────────────────────────

export async function fetchCampaigns() {
  const { data, error } = await supabase
    .from('v_campaign_summary')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error('Erro ao buscar cotações: ' + error.message)
  return data.map(normalizeCampaign)
}

export async function fetchCampaignOrders(campaignId) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, qty, status, submitted_at, producers (id, name, phone)')
    .eq('campaign_id', campaignId)
    .in('status', ['approved', 'pending'])
    .order('submitted_at', { ascending: true })
  if (error) throw new Error('Erro ao buscar pedidos: ' + error.message)
  return data
}

export async function createCampaign(c) {
  const slug = 'tb/' + c.product
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 24)
    + '-' + Date.now().toString(36)

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      slug,
      product:        c.product,
      unit:           c.unit,
      unit_weight_kg: Number(c.unitWeight),
      goal_qty:       Number(c.goalQty),
      min_qty:        Number(c.minQty),
      deadline:       c.deadline || null,
      status:         'open',
    })
    .select().single()
  if (error) throw new Error('Erro ao criar cotação: ' + error.message)
  return data
}

export async function updateCampaignFinancials(campaignId, { price, freight, markup }) {
  const patch = {}
  if (price   != null) { patch.price_per_unit = price;   patch.status = 'negotiating' }
  if (freight != null)   patch.freight_total  = freight
  if (markup  != null)   patch.markup_total   = markup

  const { data, error } = await supabase
    .from('campaigns').update(patch).eq('id', campaignId).select().single()
  if (error) throw new Error('Erro ao salvar preço: ' + error.message)
  return data
}

export async function setCampaignStatus(campaignId, status) {
  const { data, error } = await supabase
    .from('campaigns').update({ status }).eq('id', campaignId).select().single()
  if (error) throw new Error('Erro ao atualizar status: ' + error.message)
  return data
}

// ── ORDERS ────────────────────────────────────────────────────────────────────

// Suporte a múltiplos fornecedores: NÃO tem unique constraint por produtor
// A constraint unique(campaign_id, producer_id) foi removida do schema v2
export async function createOrder(campaignId, producerId, qty, status = 'pending') {
  const { data, error } = await supabase
    .from('orders')
    .insert({ campaign_id: campaignId, producer_id: producerId, qty, status })
    .select().single()
  if (error) throw new Error('Erro ao criar pedido: ' + error.message)
  return data
}

export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', orderId).select().single()
  if (error) throw new Error('Erro ao atualizar pedido: ' + error.message)
  return data
}

export async function deleteOrder(orderId) {
  const { error } = await supabase.from('orders').delete().eq('id', orderId)
  if (error) throw new Error('Erro ao remover pedido: ' + error.message)
}

// ── NORMALIZE ─────────────────────────────────────────────────────────────────

function normalizeCampaign(row) {
  return {
    id:           row.id,
    slug:         row.slug,
    product:      row.product,
    unit:         row.unit,
    unitWeight:   Number(row.unit_weight_kg),
    goalQty:      Number(row.goal_qty),
    minQty:       Number(row.min_qty),
    pricePerUnit: row.price_per_unit != null ? Number(row.price_per_unit) : null,
    freightTotal: row.freight_total  != null ? Number(row.freight_total)  : null,
    markupTotal:  row.markup_total   != null ? Number(row.markup_total)   : null,
    status:       row.status,
    deadline:     row.deadline,
    createdAt:    row.created_at?.slice(0, 10),
    approvedCount:      Number(row.approved_count   ?? 0),
    totalOrdered:       Number(row.total_ordered    ?? 0),
    pendingCount:       Number(row.pending_count    ?? 0),
    progressPct:        Number(row.progress_pct     ?? 0),
    freightPerProducer: row.freight_per_producer != null ? Number(row.freight_per_producer) : null,
    markupPerProducer:  row.markup_per_producer  != null ? Number(row.markup_per_producer)  : null,
    orders:        [],
    pendingOrders: [],
  }
}

export async function deleteCampaign(campaignId) {
  // Apaga pedidos, lotes e depois a campanha
  await supabase.from('orders').delete().eq('campaign_id', campaignId)
  const { error: errLots } = await supabase.from('campaign_lots').delete().eq('campaign_id', campaignId)
  if (errLots) throw new Error('Erro ao remover lotes: ' + errLots.message)
  const { error } = await supabase.from('campaigns').delete().eq('id', campaignId)
  if (error) throw new Error('Erro ao apagar cotação: ' + error.message)
}
