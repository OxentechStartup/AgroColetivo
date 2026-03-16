import { useState, useEffect, useCallback } from 'react'
import {
  fetchVendorProducts,
  upsertVendorProduct,
  softDeleteVendorProduct,
  addPromotion,
  deletePromotion,
} from '../lib/vendorProducts'

export function useVendorProducts(vendorId) {
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(false)

  const load = useCallback(async () => {
    if (!vendorId) { setProducts([]); return }
    setLoading(true)
    try { setProducts(await fetchVendorProducts(vendorId)) }
    catch (e) { setProducts([]) } // falha silenciosa — UI mostra lista vazia
    finally   { setLoading(false) }
  }, [vendorId])

  useEffect(() => { load() }, [load])

  const saveProduct = useCallback(async (data) => {
    const saved = await upsertVendorProduct(vendorId, data)
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...saved }; return next }
      return [saved, ...prev]
    })
    return saved
  }, [vendorId])

  const removeProduct = useCallback(async (id) => {
    setProducts(prev => prev.filter(p => p.id !== id))
    try { await softDeleteVendorProduct(id) }
    catch (e) { load(); throw e }
  }, [load])

  const addPromo = useCallback(async (productId, promo) => {
    const saved = await addPromotion(productId, promo)
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, promotions: [...(p.promotions ?? []), saved] } : p
    ))
    return saved
  }, [])

  const removePromo = useCallback(async (promoId, productId) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, promotions: (p.promotions ?? []).filter(pr => pr.id !== promoId) } : p
    ))
    try { await deletePromotion(promoId) }
    catch (e) { load(); throw e }
  }, [load])

  return { products, loading, reload: load, saveProduct, removeProduct, addPromo, removePromo }
}
