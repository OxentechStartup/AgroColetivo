import { supabase, phoneToEmail } from './supabase'
import { ROLES } from '../constants/roles'
import {
  validatePhone,
  validatePassword,
  loginLimiter,
  registerLimiter,
  detectSQLInjection,
  detectXSS,
} from '../utils/security'
import { logSecurityEvent } from './authorization'

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
export async function login(phone, password) {
  const phoneValidation = validatePhone(phone)
  if (!phoneValidation.valid) throw new Error(phoneValidation.error)
  if (detectSQLInjection(phone) || detectSQLInjection(password))
    throw new Error('Segurança: Padrão malicioso detectado')

  const clean = phoneValidation.clean
  const limiter = loginLimiter.check(clean)
  if (!limiter.allowed)
    throw new Error(`Muitas tentativas. Tente novamente em ${limiter.retryAfter}s`)

  const email = phoneToEmail(clean)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    // Loga tentativa falha de login
    await logSecurityEvent('login_failed', null, 'auth', null,
      `phone=${clean} reason=${authError.message}`)

    if (
      authError.message.includes('Invalid login credentials') ||
      authError.message.includes('Email not confirmed')
    ) throw new Error('Telefone ou senha incorretos.')
    throw new Error(authError.message)
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, name, phone, role, city, notes, active')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (userError) throw userError
  if (!userData) throw new Error('Usuário não encontrado.')

  const { active, ...rest } = userData

  // Loga login bem-sucedido
  await logSecurityEvent('login_success', rest, 'auth', rest.id,
    `role=${rest.role}`)

  if (rest.role === ROLES.VENDOR) {
    let { data: vRow } = await supabase
      .from('vendors').select('id').eq('user_id', rest.id).maybeSingle()
    if (!vRow) {
      const { data: vByPhone } = await supabase
        .from('vendors').select('id').eq('phone', clean).is('user_id', null).maybeSingle()
      if (vByPhone) {
        await supabase.from('vendors').update({ user_id: rest.id }).eq('id', vByPhone.id)
        vRow = vByPhone
      }
    }
    return { ...rest, blocked: active === false, vendorId: vRow?.id ?? null }
  }

  return { ...rest, blocked: active === false }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO — apenas roles permitidos (vendor e gestor)
// Admin nunca pode ser criado via registro público
// ─────────────────────────────────────────────────────────────────────────────
const REGISTERABLE_ROLES = [ROLES.VENDOR, ROLES.GESTOR]

export async function register(phone, password, role, extra = {}) {
  if (!REGISTERABLE_ROLES.includes(role))
    throw new Error('Tipo de conta inválido.')

  const phoneValidation = validatePhone(phone)
  if (!phoneValidation.valid) throw new Error(phoneValidation.error)

  const passwordValidation = validatePassword(password)
  if (!passwordValidation.valid)
    throw new Error(`Senha fraca: ${passwordValidation.errors.join(', ')}`)

  if (detectSQLInjection(phone) || detectSQLInjection(password))
    throw new Error('Segurança: Padrão malicioso detectado')
  if (detectXSS(extra.company_name) || detectXSS(extra.city) || detectXSS(extra.notes))
    throw new Error('Segurança: Entrada inválida detectada')

  const clean = phoneValidation.clean
  const limiter = registerLimiter.check(clean)
  if (!limiter.allowed)
    throw new Error('Muitas tentativas de registro. Tente novamente depois')

  const { data: existing } = await supabase
    .from('users').select('id').eq('phone', clean).maybeSingle()
  if (existing) throw new Error('Este telefone já está cadastrado.')

  const email = phoneToEmail(clean)
  const name = extra.company_name?.trim() || `Usuário ${clean.slice(-4)}`

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined,
      data: {
        name,
        phone: clean,
        role,
        city:  extra.city?.trim()  || null,
        notes: extra.notes?.trim() || null,
      },
    },
  })

  if (authError) {
    await logSecurityEvent('register_failed', null, 'auth', null,
      `phone=${clean} role=${role} reason=${authError.message}`)

    if (authError.message.includes('already registered'))
      throw new Error('Este telefone já está cadastrado.')
    throw new Error('Erro ao criar conta: ' + authError.message)
  }

  // Loga registro bem-sucedido
  await logSecurityEvent('register_success', { id: authData.user.id, phone: clean, role },
    'auth', authData.user.id, `role=${role}`)

  // Aguarda o trigger criar a linha em users/vendors
  await new Promise(r => setTimeout(r, 800))

  const { data: userData } = await supabase
    .from('users')
    .select('id, name, phone, role, city, notes')
    .eq('id', authData.user.id)
    .maybeSingle()

  return userData ?? {
    id:    authData.user.id,
    name,
    phone: clean,
    role,
    city:  extra.city?.trim()  || null,
    notes: extra.notes?.trim() || null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
export async function logout() {
  await supabase.auth.signOut()
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSÃO LOCAL
// ─────────────────────────────────────────────────────────────────────────────
export function getSession() {
  try {
    const raw = localStorage.getItem('agro_auth_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveSession(user) {
  try { localStorage.setItem('agro_auth_user', JSON.stringify(user)) } catch {}
}

export function clearSession() {
  try { localStorage.removeItem('agro_auth_user') } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchGestorsAdmin() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, role, city, active, created_at')
    .eq('role', ROLES.GESTOR)
    .order('name')
  if (error) throw error
  return (data ?? []).map(p => ({ ...p, active: p.active === true }))
}

export async function setGestorActive(userId, active) {
  const { data, error, status } = await supabase
    .from('users')
    .update({ active })
    .eq('id', userId)
    .select('id, active')
  if (error) throw new Error(`Supabase error ${status}: ${error.message}`)
  if (!data || data.length === 0) throw new Error('Update retornou 0 linhas.')

  if (!active) {
    const { data: camps } = await supabase
      .from('campaigns')
      .select('id')
      .eq('pivo_id', userId)
      .in('status', ['open', 'negotiating'])
    if (camps?.length)
      await supabase
        .from('campaigns')
        .update({ status: 'closed' })
        .in('id', camps.map(c => c.id))
  }
}
