import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iepgeibcwthilohdlfse.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcGdlaWJjd3RoaWxvaGRsZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTUyOTYsImV4cCI6MjA4ODM5MTI5Nn0.Vvie7aAlKRS9O-Gbf2gCfMTMuBgwJcBi0XMdPFIKGzQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
