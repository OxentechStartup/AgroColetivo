import { supabase } from './supabase'

export async function login(username, password) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, username, role')
    .eq('username', username)
    .eq('password_hash', password)   // plain text para MVP (troque por bcrypt em produção)
    .maybeSingle()

  if (error) throw error
  if (!data)  throw new Error('Usuário ou senha incorretos.')
  return data
}

export function getSession() {
  try {
    const s = sessionStorage.getItem('agro_session')
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export function saveSession(user) {
  sessionStorage.setItem('agro_session', JSON.stringify(user))
}

export function clearSession() {
  sessionStorage.removeItem('agro_session')
}
