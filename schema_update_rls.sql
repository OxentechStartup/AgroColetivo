-- ============================================================
-- AgroColetivo — UPDATE RLS (para banco já existente)
-- Cole no SQL Editor do Supabase se já rodou o schema antes.
-- NÃO apaga dados. Só corrige permissões e adiciona coluna.
-- ============================================================

-- 1. Garante que a coluna email_verified existe na tabela users
alter table public.users
  add column if not exists email_verified boolean not null default false;

-- 2. Garante que a tabela email_verifications existe
create table if not exists email_verifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references users(id) on delete cascade,
  code       text        not null unique,
  expires_at timestamptz not null,
  verified   boolean     not null default false,
  created_at timestamptz not null default now()
);
create index if not exists email_verifications_user_id_idx on email_verifications(user_id);
create index if not exists email_verifications_code_idx    on email_verifications(code);

-- 3. Desabilitar RLS em todas as tabelas (sistema usa auth manual, não JWT Supabase)
alter table public.users                disable row level security;
alter table public.vendors              disable row level security;
alter table public.campaigns            disable row level security;
alter table public.campaign_lots        disable row level security;
alter table public.products             disable row level security;
alter table public.product_promotions   disable row level security;
alter table public.orders               disable row level security;
alter table public.buyers               disable row level security;
alter table public.email_verifications  disable row level security;

-- 4. Marca usuários de teste como verificados (caso já existam no banco)
update public.users
set email_verified = true
where email in (
  'admin@agrocoletivo.local',
  'gestor@agrocoletivo.local',
  'vendor1@agrocoletivo.local',
  'vendor2@agrocoletivo.local'
);

-- Pronto! Execute este arquivo no Supabase SQL Editor.
-- Não apaga nenhum dado existente.
