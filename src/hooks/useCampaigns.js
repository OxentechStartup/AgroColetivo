import { useState, useEffect, useCallback } from 'react'
import {
  fetchCampaigns, setCampaignStatus,
  createCampaign, updateCampaignFinancials,
  createOrder, updateOrderStatus, deleteOrder,
  deleteCampaign as apiDeleteCampaign,
} from '../lib/campaigns'
import { fetchOrdersWithLots, fetchLots, createLot, deleteLot, assignOrderToLot } from '../lib/lots'
import { fetchVendors, createVendor, deleteVendor } from '../lib/vendors'
import { findOrCreateProducer } from '../lib/producers'

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [vendors,   setVendors]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // ── Recarrega apenas uma campanha ─────────────────────────────────────────
  const reloadCampaign = useCallback(async (campaignId) => {
    const [allOrders, lots] = await Promise.all([
      fetchOrdersWithLots(campaignId),
      fetchLots(campaignId),
    ])
    setCampaigns(prev => prev.map(c => {
      if (c.id !== campaignId) return c
      const approved = allOrders.filter(o => o.status === 'approved').map(normalizeOrder)
      const pending  = allOrders.filter(o => o.status === 'pending').map(normalizeOrder)
      return {
        ...c,
        orders:        approved,
        pendingOrders: pending,
        lots,
        approvedCount: approved.length,
        totalOrdered:  approved.reduce((s, o) => s + o.qty, 0),
        pendingCount:  pending.length,
      }
    }))
  }, [])

  // ── Carga completa ────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rawCampaigns, rawVendors] = await Promise.all([
        fetchCampaigns(),
        fetchVendors(),
      ])
      const withOrders = await Promise.all(
        rawCampaigns.map(async (c) => {
          const [all, lots] = await Promise.all([
            fetchOrdersWithLots(c.id),
            fetchLots(c.id),
          ])
          return {
            ...c,
            orders:        all.filter(o => o.status === 'approved').map(normalizeOrder),
            pendingOrders: all.filter(o => o.status === 'pending').map(normalizeOrder),
            lots,
          }
        })
      )
      setCampaigns(withOrders)
      setVendors(rawVendors)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── CAMPANHAS ─────────────────────────────────────────────────────────────
  const addCampaign    = async (c)        => { await createCampaign(c); await loadAll() }
  const saveFinancials = async (id, vals) => {
    await updateCampaignFinancials(id, vals)
    setCampaigns(prev => prev.map(c => c.id !== id ? c : {
      ...c,
      pricePerUnit: vals.price   ?? c.pricePerUnit,
      freightTotal: vals.freight ?? c.freightTotal,
      markupTotal:  vals.markup  ?? c.markupTotal,
      status: 'negotiating',
    }))
  }
  const closeCampaign  = async (id) => { await setCampaignStatus(id, 'closed'); setCampaigns(prev => prev.map(c => c.id===id ? {...c,status:'closed'}  : c)) }
  const reopenCampaign = async (id) => { await setCampaignStatus(id, 'open');   setCampaigns(prev => prev.map(c => c.id===id ? {...c,status:'open'}    : c)) }

  // ── LOTES ─────────────────────────────────────────────────────────────────
  const addLot    = async (campaignId, lot)    => { await createLot(campaignId, lot); await reloadCampaign(campaignId) }
  const removeLot = async (campaignId, lotId)  => { await deleteLot(lotId);           await reloadCampaign(campaignId) }
  const allocate  = async (campaignId, orderId, lotId) => { await assignOrderToLot(orderId, lotId); await reloadCampaign(campaignId) }

  // ── PEDIDOS ───────────────────────────────────────────────────────────────
  const addOrder = async (campaignId, order) => {
    const producer = await findOrCreateProducer(order.producerName, order.phone)
    await createOrder(campaignId, producer.id, order.qty, 'approved')
    await reloadCampaign(campaignId)
  }
  const removeOrder = async (campaignId, orderId) => {
    await deleteOrder(orderId)
    await reloadCampaign(campaignId)
  }
  const addPendingOrder = async (campaignId, order) => {
    const producer = await findOrCreateProducer(order.producerName, order.phone)
    await createOrder(campaignId, producer.id, order.qty, 'pending')
    await reloadCampaign(campaignId)
  }
  const approvePending = async (campaignId, orderId) => {
    await updateOrderStatus(orderId, 'approved')
    await reloadCampaign(campaignId)
  }
  const rejectPending = async (campaignId, orderId) => {
    await updateOrderStatus(orderId, 'rejected')
    await reloadCampaign(campaignId)
  }

  // ── VENDEDORES ────────────────────────────────────────────────────────────
  const deleteCampaign = async (id) => {
    await apiDeleteCampaign(id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  const addVendor    = async (v)  => { const nv = await createVendor(v); setVendors(prev => [...prev, nv]) }
  const removeVendor = async (id) => { await deleteVendor(id); setVendors(prev => prev.filter(v => v.id !== id)) }

  return {
    campaigns, vendors, loading, error, reload: loadAll,
    addCampaign, saveFinancials, closeCampaign, reopenCampaign,
    addLot, removeLot, deleteCampaign, allocate,
    addOrder, removeOrder, addPendingOrder, approvePending, rejectPending,
    addVendor, removeVendor,
  }
}

function normalizeOrder(o) {
  // custo vem do lote associado, se existir
  const lot = o.campaign_lots
  return {
    orderId:      o.id,
    producerName: o.producers?.name  ?? '—',
    phone:        o.producers?.phone ?? '',
    qty:          o.qty,
    confirmedAt:  o.submitted_at?.slice(0, 10),
    lotId:        o.lot_id ?? null,
    lotVendor:    lot?.vendors?.name || lot?.vendor_name || null,
    lotPrice:     lot?.price_per_unit ?? null,
    lotFreight:   lot?.freight        ?? null,
    lotMarkup:    lot?.markup         ?? null,
  }
}
