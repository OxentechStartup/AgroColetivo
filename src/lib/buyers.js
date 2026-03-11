import { supabase } from './supabase'

// ── BUYERS (fazendeiros/compradores) ──────────────────────────────────────────
// Identificados por telefone — sem senha (acesso via link).
// O sistema os reconhece automaticamente nas próximas cotações.

export async function findOrCreateBuyer(name, phone) {
  const cleanPhone = phone.replace(/\D/g, '')

  // Tenta encontrar pelo telefone
  const { data: existing } = await supabase
    .from('buyers')
    .select('id, name, phone, city')
    .eq('phone', cleanPhone)
    .maybeSingle()

  if (existing) return existing

  // Cria novo buyer
  const { data, error } = await supabase
    .from('buyers')
    .insert({ name: name.trim(), phone: cleanPhone })
    .select()
    .single()

  if (error) throw new Error('Erro ao cadastrar comprador: ' + error.message)
  return data
}

// Buscar histórico de um buyer pelo telefone (para o portal público)
export async function fetchBuyerHistory(phone) {
  const cleanPhone = phone.replace(/\D/g, '')

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, qty, status, submitted_at,
      campaigns (id, product, unit, status, deadline),
      buyers!inner (name, phone)
    `)
    .eq('buyers.phone', cleanPhone)
    .neq('status', 'rejected')
    .order('submitted_at', { ascending: false })

  if (error) throw new Error('Erro ao buscar histórico: ' + error.message)
  return data
}

// Buscar dados de um buyer por telefone (reconhecimento automático)
export async function getBuyerByPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '')
  const { data } = await supabase
    .from('buyers')
    .select('id, name, phone, city')
    .eq('phone', cleanPhone)
    .maybeSingle()
  return data ?? null
}

// Listar todos os buyers (para o pivô)
export async function fetchBuyers() {
  const { data, error } = await supabase
    .from('buyers')
    .select('id, name, phone, city, created_at')
    .order('name', { ascending: true })
  if (error) throw new Error('Erro ao buscar compradores: ' + error.message)
  return data
}

// Legado: alias para compatibilidade com código antigo (producers → buyers)
export const findOrCreateProducer = findOrCreateBuyer
export const fetchProducerCosts   = async () => {
  const { data, error } = await supabase
    .from('v_producer_costs')
    .select('*')
    .order('producer_name', { ascending: true })
  if (error) throw new Error('Erro ao buscar custos: ' + error.message)
  return data
}
