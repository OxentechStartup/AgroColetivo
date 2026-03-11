import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, active } = await req.json()

    if (!userId || active === undefined) {
      return new Response(JSON.stringify({ error: 'userId e active são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Usa service_role via variável de ambiente do Supabase (seguro — roda server-side)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Atualiza active do pivô
    const { data, error } = await supabase
      .from('users')
      .update({ active })
      .eq('id', userId)
      .select('id, active')

    if (error) throw error
    if (!data || data.length === 0) throw new Error('Nenhuma linha atualizada')

    // Se bloqueando: fecha campanhas abertas
    if (!active) {
      const { data: camps } = await supabase
        .from('campaigns')
        .select('id')
        .eq('pivo_id', userId)
        .in('status', ['open', 'negotiating'])

      if (camps?.length) {
        await supabase
          .from('campaigns')
          .update({ status: 'closed', closed_at: new Date().toISOString() })
          .in('id', camps.map((c: any) => c.id))
      }
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
