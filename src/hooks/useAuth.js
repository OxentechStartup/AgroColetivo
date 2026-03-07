import { useState, useCallback } from 'react'
import { login, getSession, saveSession, clearSession } from '../lib/auth'

export function useAuth() {
  const [user,    setUser]    = useState(() => getSession())
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const signIn = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const u = await login(username, password)
      saveSession(u)
      setUser(u)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  return { user, loading, error, signIn, signOut }
}
