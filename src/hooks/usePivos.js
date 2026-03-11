import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePivos() {
  const [pivos,   setPivos]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('users')
      .select('id, name, phone, role, city, notes')
      .eq('role', 'pivo')
      .order('name')
      .then(({ data }) => { setPivos(data ?? []); setLoading(false) })
  }, [])

  return { pivos, loading }
}
