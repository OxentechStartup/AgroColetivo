import { supabase } from './supabase'

export async function fetchLots(campaignId) {
  const { data, error } = await supabase
    .from('campaign_lots')
    .select('*, vendors(name, phone)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })
  if (error) throw new Error('Erro ao buscar lotes: ' + error.message)
  return (data ?? []).map(normalizeLot)
}

export async function createLot(campaignId, lot) {
  const { data, error } = await supabase
    .from('campaign_lots')
    .insert({
      campaign_id:    campaignId,
      vendor_id:      lot.vendorId   || null,
      vendor_name:    lot.vendorName || null,
      product_id:     lot.productId  || null,
      qty_available:  Number(lot.qtyAvailable),
      price_per_unit: Number(lot.pricePerUnit),
      notes:          lot.notes || null,
    })
    .select().single()
  if (error) throw new Error('Erro ao criar lote: ' + error.message)
  return normalizeLot(data)
}

export async function deleteLot(lotId) {
  const { error } = await supabase.from('campaign_lots').delete().eq('id', lotId)
  if (error) throw new Error(error.message)
}

export async function assignOrderToLot(orderId, lotId) {
  const { error } = await supabase.from('orders').update({ lot_id: lotId }).eq('id', orderId)
  if (error) throw new Error(error.message)
}

export async function fetchOrdersWithLots(campaignId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, qty, status, submitted_at, lot_id,
      buyers (id, name, phone),
      campaign_lots (id, vendor_name, price_per_unit, qty_available, vendors(name))
    `)
    .eq('campaign_id', campaignId)
    .in('status', ['approved', 'pending'])
    .order('submitted_at', { ascending: true })
  if (error) throw new Error('Erro ao buscar pedidos: ' + error.message)
  return data ?? []
}

function normalizeLot(r) {
  return {
    id:           r.id,
    campaignId:   r.campaign_id,
    vendorId:     r.vendor_id,
    vendorName:   r.vendors?.name || r.vendor_name || 'Fornecedor avulso',
    qtyAvailable: Number(r.qty_available),
    pricePerUnit: Number(r.price_per_unit),
    priority:     Number(r.priority ?? 0),
    notes:        r.notes,
    createdAt:    r.created_at?.slice(0, 10),
  }
}
