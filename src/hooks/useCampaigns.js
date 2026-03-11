import { useState, useEffect, useCallback } from 'react'
import { fetchCampaigns, setCampaignStatus, createCampaign, updateCampaignFinancials, createOrder, updateOrderStatus, deleteOrder, deleteCampaign as apiDeleteCampaign } from '../lib/campaigns'
import { fetchOrdersWithLots, fetchLots, createLot, deleteLot, assignOrderToLot } from '../lib/lots'
import { fetchVendors, createVendor, deleteVendor } from '../lib/vendors'
import { findOrCreateProducer } from '../lib/producers'
import { supabase } from '../lib/supabase'

export function useCampaigns(user) {
  const [campaigns, setCampaigns] = useState([])
  const [vendors,   setVendors]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const reloadCampaign = useCallback(async (campaignId) => {
    const isVendor = user?.role === 'vendor'
    const [allOrders, lots] = await Promise.all([
      fetchOrdersWithLots(campaignId),
      fetchLots(campaignId),
    ])
    setCampaigns(prev => prev.map(c => {
      if (c.id !== campaignId) return c
      const approved = allOrders.filter(o => o.status === 'approved').map(normalizeOrder)
      const pending  = allOrders.filter(o => o.status === 'pending').map(normalizeOrder)

      const vendorId = user?.vendorId ?? null
      const visibleLots    = isVendor && vendorId ? lots.filter(l => l.vendorId === vendorId) : lots
      const visibleOrders  = isVendor ? [] : approved
      const visiblePending = isVendor ? [] : pending

      return {
        ...c,
        orders:        visibleOrders,
        pendingOrders: visiblePending,
        lots:          visibleLots,
        approvedCount: approved.length,
        totalOrdered:  approved.reduce((s, o) => s + o.qty, 0),
        pendingCount:  pending.length,
      }
    }))
  }, [user])

  const loadAll = useCallback(async () => {
    // Sem usuário logado, limpa tudo e não busca nada
    if (!user) {
      setCampaigns([]); setVendors([]); setLoading(false); setError(null)
      return
    }

    setLoading(true); setError(null)
    try {
      let userWithVendorId = user
      if (user.role === 'vendor' && !user.vendorId) {
        const { data: vRow } = await supabase
          .from('vendors').select('id').eq('user_id', user.id).maybeSingle()
        if (vRow) userWithVendorId = { ...user, vendorId: vRow.id }
      }

      const [rawCampaigns, rawVendors] = await Promise.all([
        fetchCampaigns(userWithVendorId),
        fetchVendors(),
      ])
      const isVendor = user.role === 'vendor'
      const vendorId = userWithVendorId?.vendorId ?? null

      const withOrders = await Promise.all(rawCampaigns.map(async (c) => {
        const [all, lots] = await Promise.all([fetchOrdersWithLots(c.id), fetchLots(c.id)])

        const visibleLots = isVendor && vendorId
          ? lots.filter(l => l.vendorId === vendorId)
          : lots

        const approved = all.filter(o => o.status === 'approved').map(normalizeOrder)
        const pending  = all.filter(o => o.status === 'pending').map(normalizeOrder)

        return {
          ...c,
          orders:        isVendor ? [] : approved,
          pendingOrders: isVendor ? [] : pending,
          lots:          visibleLots,
        }
      }))
      setCampaigns(withOrders); setVendors(rawVendors)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [user])  // ← user como dependência: recarrega sempre que o usuário mudar

  useEffect(() => { loadAll() }, [loadAll])

  const addCampaign    = async (c)       => { await createCampaign(c, user?.id); await loadAll() }
  const saveFinancials = async (id, v)   => { await updateCampaignFinancials(id, v); await reloadCampaign(id) }
  const closeCampaign  = async (id)      => { await setCampaignStatus(id, 'closed');    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'closed' } : c)) }
  const reopenCampaign = async (id)      => { await setCampaignStatus(id, 'open');      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'open'   } : c)) }
  const deleteCampaign = async (id)      => { await apiDeleteCampaign(id); setCampaigns(prev => prev.filter(c => c.id !== id)) }

  const addLot    = async (campaignId, lot)    => { await createLot(campaignId, lot); await reloadCampaign(campaignId) }
  const removeLot = async (campaignId, lotId)  => { await deleteLot(lotId);           await reloadCampaign(campaignId) }
  const allocate  = async (campaignId, orderId, lotId) => { await assignOrderToLot(orderId, lotId); await reloadCampaign(campaignId) }

  const addOrder = async (campaignId, order) => {
    const buyer = await findOrCreateProducer(order.producerName, order.phone)
    await createOrder(campaignId, buyer.id, order.qty, 'approved')
    await reloadCampaign(campaignId)
  }
  const removeOrder = async (campaignId, orderId) => { await deleteOrder(orderId); await reloadCampaign(campaignId) }

  const addPendingOrder = async (campaignId, order) => {
    const buyer = await findOrCreateProducer(order.producerName, order.phone)
    await createOrder(campaignId, buyer.id, order.qty, 'pending')
    await reloadCampaign(campaignId)
  }
  const approvePending = async (campaignId, orderId) => { await updateOrderStatus(orderId, 'approved'); await reloadCampaign(campaignId) }
  const rejectPending  = async (campaignId, orderId) => { await updateOrderStatus(orderId, 'rejected'); await reloadCampaign(campaignId) }

  const addVendor    = async (v)  => { const nv = await createVendor(v); setVendors(prev => [...prev, nv]) }
  const removeVendor = async (id) => { await deleteVendor(id); setVendors(prev => prev.filter(v => v.id !== id)) }

  return { campaigns, vendors, loading, error, reload: loadAll, addCampaign, saveFinancials, closeCampaign, reopenCampaign, addLot, removeLot, deleteCampaign, allocate, addOrder, removeOrder, addPendingOrder, approvePending, rejectPending, addVendor, removeVendor }
}

function normalizeOrder(o) {
  // suporta tanto buyers (novo schema) quanto producers (legado)
  const person = o.buyers ?? o.producers
  const lot    = o.campaign_lots
  return {
    orderId:      o.id,
    producerName: person?.name  ?? '—',
    phone:        person?.phone ?? '',
    qty:          o.qty,
    confirmedAt:  o.submitted_at?.slice(0, 10),
    lotId:        o.lot_id ?? null,
    lotVendor:    lot?.vendors?.name || lot?.vendor_name || null,
    lotPrice:     lot?.price_per_unit ?? null,
  }
}
