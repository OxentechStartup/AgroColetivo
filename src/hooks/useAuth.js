import { useState, useCallback, useEffect } from 'react'
import { login, register, getSession, saveSession, clearSession } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user,    setUser]    = useState(() => getSession())
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // Valida sessão salva contra o banco (detecta banco recriado)
  useEffect(() => {
    const saved = getSession()
    if (!saved?.id) return
    supabase.from('users').select('id').eq('id', saved.id).maybeSingle()
      .then(({ data }) => {
        if (!data) {
          // Usuário não existe mais no banco (banco foi recriado) — força novo login
          clearSession()
          setUser(null)
        }
      })
      .catch(() => {}) // silencia erros de rede
  }, [])

  const signIn = useCallback(async (phone, password) => {
    setLoading(true); setError(null)
    try {
      clearSession()           // garante que sessão anterior é apagada antes
      const u = await login(phone, password)
      saveSession(u)
      setUser(u)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  const signUp = useCallback(async (phone, password, role, extra = {}) => {
    setLoading(true); setError(null)
    try {
      clearSession()           // garante que sessão anterior é apagada antes
      const u = await register(phone, password, role, extra)
      saveSession(u)
      setUser(u)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
    setError(null)
  }, [])

  return { user, loading, error, signIn, signUp, signOut }
}
