import { useState, useCallback, useEffect, useRef } from 'react'
import { login, register, logout, getSession, saveSession, clearSession } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user,    setUser]    = useState(() => getSession())
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  // Ref para evitar que onAuthStateChange sobrescreva sessão durante login manual
  const manualAuthInProgress = useRef(false)

  useEffect(() => {
    // Valida sessão salva ao iniciar o app (banco pode ter mudado)
    const saved = getSession()
    if (saved?.id) {
      supabase
        .from('users')
        .select('id, active')
        .eq('id', saved.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) {
            clearSession()
            setUser(null)
          } else if (data.active === false && !saved.blocked) {
            // Usuário foi bloqueado enquanto estava com sessão ativa
            const updated = { ...saved, blocked: true }
            saveSession(updated)
            setUser(updated)
          }
        })
        .catch(() => {})
    }

    // Escuta mudanças de sessão (token refresh, logout em outra aba, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignora eventos durante login/registro manual (evita race condition)
        if (manualAuthInProgress.current) return

        if (event === 'SIGNED_OUT' || !session) {
          clearSession()
          setUser(null)
          return
        }

        // TOKEN_REFRESHED: renova silenciosamente sem fazer nada visível
        // SIGNED_IN disparado externamente (outra aba, deep link) — rebusca dados
        if (event === 'TOKEN_REFRESHED') return // JWT renovou, não precisa fazer nada

        if (event === 'SIGNED_IN') {
          const saved = getSession()
          if (saved?.id === session.user.id) return // já temos os dados, ignora

          // Login externo (outra aba) — sincroniza estado
          const { data } = await supabase
            .from('users')
            .select('id, name, phone, role, city, notes, active')
            .eq('id', session.user.id)
            .maybeSingle()

          if (data) {
            const { active, ...rest } = data
            const freshUser = { ...rest, blocked: active === false }
            saveSession(freshUser)
            setUser(freshUser)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (phone, password) => {
    setLoading(true)
    setError(null)
    manualAuthInProgress.current = true
    try {
      clearSession()
      const u = await login(phone, password)
      saveSession(u)
      setUser(u)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      // Pequeno delay para garantir que onAuthStateChange não interfere
      setTimeout(() => { manualAuthInProgress.current = false }, 500)
    }
  }, [])

  const signUp = useCallback(async (phone, password, role, extra = {}) => {
    setLoading(true)
    setError(null)
    manualAuthInProgress.current = true
    try {
      clearSession()
      const u = await register(phone, password, role, extra)
      saveSession(u)
      setUser(u)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setTimeout(() => { manualAuthInProgress.current = false }, 500)
    }
  }, [])

  const signOut = useCallback(async () => {
    clearSession()
    setUser(null)
    setError(null)
    try {
      await logout()
    } catch {
      // ignora erros de logout (ex: sessão já expirada)
    }
  }, [])

  return { user, loading, error, signIn, signUp, signOut }
}
