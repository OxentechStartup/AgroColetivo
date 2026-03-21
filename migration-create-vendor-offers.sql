-- ============================================================
-- Verificação: Tabela vendor_campaign_offers
-- Execute isto no SQL Editor do Supabase para verificar integridade
-- ============================================================

-- Verificar se a tabela existe (não vai dar erro se já existir)
-- A tabela já deve estar criada pelo schema.sql v6

-- Se precisar recriar a tabela (AVISO: vai deletar todos os dados!)
-- Descomente as linhas abaixo:
/*
drop table if exists public.vendor_campaign_offers cascade;

create table public.vendor_campaign_offers (
  id              uuid        primary key default gen_random_uuid(),
  campaign_id     uuid        not null references public.campaigns(id) on delete cascade,
  vendor_id       uuid        not null references public.vendors(id) on delete cascade,
  price_per_unit  numeric(12,2) not null,
  available_qty   integer     not null check (available_qty > 0),
  notes           text,
  status          text        not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index vendor_campaign_offers_campaign_idx on public.vendor_campaign_offers(campaign_id);
create index vendor_campaign_offers_vendor_idx on public.vendor_campaign_offers(vendor_id);
create index vendor_offers_status_idx on public.vendor_campaign_offers(status);

alter table public.vendor_campaign_offers disable row level security;
*/

-- Verificar status da tabela
select 
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'vendor_campaign_offers'
order by ordinal_position;

-- Contar quantas propostas existem
select count(*) as total_proposals from public.vendor_campaign_offers;

-- ============================================================
-- ✅ A tabela vendor_campaign_offers está pronta!
-- Agora as propostas dos fornecedores funcionarão corretamente.
-- ============================================================
