import { supabase } from './supabase'

export async function login(phone, password) {
  const clean = phone.replace(/\D/g, '')
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, role, city, notes, active')
    .eq('phone', clean)
    .eq('password_hash', password)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Telefone ou senha incorretos.')
  // active NULL = ativo; active === false = bloqueado (acesso restrito ao dashboard)
  const { active, ...rest } = data
  return { ...rest, blocked: active === false }
}

export async function register(phone, password, role, extra = {}) {
  const clean = phone.replace(/\D/g, '')
  const { data: ex } = await supabase.from('users').select('id').eq('phone', clean).maybeSingle()
  if (ex) throw new Error('Este telefone já está cadastrado.')

  const name = extra.company_name?.trim() || `Usuário ${clean.slice(-4)}`

  const { data, error } = await supabase
    .from('users')
    .insert({ name, phone: clean, password_hash: password, role, city: extra.city?.trim() || null, notes: extra.notes?.trim() || null })
    .select('id, name, phone, role, city, notes')
    .single()
  if (error) throw new Error('Erro ao criar conta: ' + error.message)

  if (role === 'vendor') {
    await supabase.from('vendors').insert({
      user_id: data.id,
      name,
      phone:   clean,
      city:    extra.city?.trim()  || null,
      notes:   extra.notes?.trim() || null,
    }).maybeSingle()
  }

  return data
}

export function getSession()      { try { const s = sessionStorage.getItem('agro_session'); return s ? JSON.parse(s) : null } catch { return null } }
export function saveSession(user) { sessionStorage.setItem('agro_session', JSON.stringify(user)) }
export function clearSession()    { sessionStorage.removeItem('agro_session') }

export async function fetchPivosAdmin() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, role, city, active, created_at')
    .eq('role', 'pivo')
    .order('name')
  if (error) throw error
  return (data ?? []).map(p => ({ ...p, active: p.active === true }))
}

export async function setPivoActive(userId, active) {
  console.log('[setPivoActive] chamando update', { userId, active })
  const { data, error, status } = await supabase
    .from('users')
    .update({ active })
    .eq('id', userId)
    .select('id, active')
  console.log('[setPivoActive] resultado', { data, error, status })
  if (error) throw new Error(`Supabase error ${status}: ${error.message}`)
  if (!data || data.length === 0) throw new Error('Update retornou 0 linhas.')

  if (!active) {
    const { data: camps } = await supabase
      .from('campaigns')
      .select('id')
      .eq('pivo_id', userId)
      .in('status', ['open', 'negotiating'])
    if (camps?.length) {
      await supabase
        .from('campaigns')
        .update({ status: 'closed' })
        .in('id', camps.map(c => c.id))
    }
  }
}
