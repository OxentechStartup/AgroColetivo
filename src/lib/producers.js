import { supabase } from './supabase'

export async function findOrCreateProducer(name, phone) {
  const cleanPhone = phone.replace(/\D/g, '')

  // tenta achar pelo telefone
  const { data: existing } = await supabase
    .from('producers')
    .select('id, name, phone')
    .eq('phone', cleanPhone)
    .maybeSingle()

  if (existing) return existing

  // cria novo
  const { data, error } = await supabase
    .from('producers')
    .insert({ name: name.trim(), phone: cleanPhone })
    .select().single()

  if (error) throw new Error('Erro ao cadastrar produtor: ' + error.message)
  return data
}

export async function fetchProducerCosts() {
  const { data, error } = await supabase
    .from('v_producer_costs')
    .select('*')
    .order('producer_name', { ascending: true })
  if (error) throw new Error('Erro ao buscar custos: ' + error.message)
  return data
}
