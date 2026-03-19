-- ============================================================
-- MIGRATION: Adicionar sistema de notificações em tempo real
-- Execute isto no Supabase SQL Editor
-- ============================================================

-- Criar tabela de notificações
create table if not exists public.notifications (
  id              uuid        primary key default gen_random_uuid(),
  pivo_id         uuid        not null references public.users(id) on delete cascade,
  type            text        not null, -- "order_canceled", "order_approved", etc
  title           text        not null,
  message         text        not null,
  related_order_id uuid       references public.orders(id) on delete cascade,
  related_campaign_id uuid    references public.campaigns(id) on delete cascade,
  read            boolean     not null default false,
  created_at      timestamptz not null default now()
);

-- Criar índices para queries rápidas
create index notifications_pivo_id_idx on public.notifications(pivo_id);
create index notifications_pivo_read_idx on public.notifications(pivo_id, read);
create index notifications_created_at_idx on public.notifications(created_at desc);

-- Habilitar RLS (se necessário)
-- alter table public.notifications enable row level security;
-- 
-- create policy "Users can see their own notifications"
--   on public.notifications for select
--   using (pivo_id = auth.uid());
