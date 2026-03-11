import { supabase } from './supabase'

// Tabela: buyers (id, name, phone, city)
export async function findOrCreateProducer(name, phone) {
  const clean = phone.replace(/\D/g, '')
  const { data: existing } = await supabase
    .from('buyers').select('id, name, phone').eq('phone', clean).maybeSingle()
  if (existing) return existing

  const { data, error } = await supabase
    .from('buyers').insert({ name: name.trim(), phone: clean }).select().single()
  if (error) throw new Error('Erro ao cadastrar produtor: ' + error.message)
  return data
}

export async function fetchProducerCosts() {
  const { data, error } = await supabase
    .from('v_producer_costs').select('*').order('producer_name', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}
