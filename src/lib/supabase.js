import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iepgeibcwthilohdlfse.supabase.co'
const SUPABASE_KEY = 'sb_publishable_oJzyWMZ4uR0e71C_k3NO7A_1bVtNMco'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
