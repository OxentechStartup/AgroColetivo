-- ============================================================
-- AgroColetivo — Schema v5 (COMPLETO + CORRIGIDO)
-- Cole tudo no SQL Editor do Supabase e execute
-- ============================================================
--
-- ✅ Login admin: via Supabase Auth (conta criada no painel)
-- ✅ Login outros: senha manual na tabela users
-- ✅ UUID da tabela users = UUID do Supabase Auth (para admin)
-- ✅ RLS desabilitado
-- ✅ Sem usuários seed — sistema limpo
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- PARTE 1: LIMPAR TUDO
-- ══════════════════════════════════════════════════════════════

drop view     if exists v_producer_costs        cascade;
drop view     if exists v_campaign_summary      cascade;
drop table    if exists email_verifications     cascade;
drop table    if exists pending_registrations   cascade;
drop table    if exists orders                  cascade;
drop table    if exists campaign_lots           cascade;
drop table    if exists campaigns               cascade;
drop table    if exists product_promotions      cascade;
drop table    if exists products                cascade;
drop table    if exists vendors                 cascade;
drop table    if exists buyers                  cascade;
drop table    if exists producers               cascade;
drop table    if exists users                   cascade;
drop table    if exists admin_users             cascade;
drop type     if exists promo_type              cascade;
drop type     if exists product_unit            cascade;
drop type     if exists order_status            cascade;
drop type     if exists campaign_status         cascade;
drop type     if exists user_role               cascade;
drop function if exists find_or_create_buyer    cascade;


-- ══════════════════════════════════════════════════════════════
-- PARTE 2: ENUMs
-- ══════════════════════════════════════════════════════════════

create type user_role       as enum ('admin', 'pivo', 'vendor', 'buyer');
create type campaign_status as enum ('open', 'negotiating', 'closed', 'finished');
create type order_status    as enum ('pending', 'approved', 'rejected');
create type product_unit    as enum ('sacos','kg','toneladas','litros','fardos','caixas','unidades');
create type promo_type      as enum ('fixed_discount','percent_discount','fixed_bonus');


-- ══════════════════════════════════════════════════════════════
-- PARTE 3: TABELAS
-- ══════════════════════════════════════════════════════════════

-- ── users: perfil de todos os usuários ────────────────────────
-- Para admin: id = UUID do Supabase Auth, password_hash vazio
-- Para vendor/gestor: id = UUID gerado pelo app, password_hash = senha
create table public.users (
  id                uuid        primary key default gen_random_uuid(),
  email             text        unique not null,
  email_verified    boolean     not null default false,
  name              text        not null,
  phone             text        not null default '',
  password_hash     text        not null default '',
  profile_photo_url text,
  role              user_role   not null,
  city              text,
  notes             text,
  active            boolean     not null default true,
  created_at        timestamptz not null default now()
);
create index users_email_idx on public.users(email);
create index users_phone_idx on public.users(phone);

-- ── buyers: produtores/fazendeiros (acesso via link, sem senha)
create table public.buyers (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  phone      text        unique not null,
  city       text,
  notes      text,
  created_at timestamptz not null default now()
);
create index buyers_phone_idx on public.buyers(phone);

-- ── vendors: fornecedores vinculados a um user role=vendor ─────
create table public.vendors (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        unique references public.users(id) on delete cascade,
  name       text        not null,
  phone      text,
  photo_url  text,
  city       text,
  notes      text,
  created_at timestamptz not null default now()
);

-- ── products: catálogo de produtos por vendor ──────────────────
create table public.products (
  id             uuid          primary key default gen_random_uuid(),
  vendor_id      uuid          not null references public.vendors(id) on delete cascade,
  name           text          not null,
  description    text,
  unit           product_unit  not null default 'sacos',
  unit_weight_kg numeric(10,3) not null default 0,
  price_per_unit numeric(12,2) not null,
  qty_available  integer       not null default 0,
  active         boolean       not null default true,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

-- ── product_promotions: promoções condicionais por quantidade ──
create table public.product_promotions (
  id          uuid          primary key default gen_random_uuid(),
  product_id  uuid          not null references public.products(id) on delete cascade,
  min_qty     integer       not null check (min_qty > 0),
  promo_type  promo_type    not null,
  value       numeric(12,2) not null check (value > 0),
  description text,
  active      boolean       not null default true,
  created_at  timestamptz   not null default now()
);

-- ── campaigns: cotações criadas por gestores (pivôs) ──────────
create table public.campaigns (
  id             uuid            primary key default gen_random_uuid(),
  pivo_id        uuid            not null references public.users(id) on delete cascade,
  slug           text            unique not null,
  product        text            not null,
  unit           text            not null default 'sacos',
  unit_weight_kg numeric(10,3)   not null default 25,
  goal_qty       integer         not null check (goal_qty > 0),
  min_qty        integer         not null check (min_qty > 0),
  price_per_unit numeric(12,2),
  freight_total  numeric(12,2),
  markup_total   numeric(12,2),
  status         campaign_status not null default 'open',
  deadline       date,
  closed_at      timestamptz,
  created_at     timestamptz     not null default now()
);

-- ── campaign_lots: lotes de fornecedores em uma cotação ────────
create table public.campaign_lots (
  id             uuid          primary key default gen_random_uuid(),
  campaign_id    uuid          not null references public.campaigns(id) on delete cascade,
  vendor_id      uuid          references public.vendors(id) on delete set null,
  vendor_name    text,
  product_id     uuid          references public.products(id) on delete set null,
  qty_available  integer       not null check (qty_available > 0),
  price_per_unit numeric(12,2) not null,
  freight        numeric(12,2) not null default 0,
  markup         numeric(12,2) not null default 0,
  notes          text,
  created_at     timestamptz   not null default now()
);

-- ── email_verifications: códigos de verificação por email ──────
create table public.email_verifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  code       text        not null unique,
  expires_at timestamptz not null,
  verified   boolean     not null default false,
  created_at timestamptz not null default now()
);
create index email_verifications_user_id_idx on public.email_verifications(user_id);
create index email_verifications_code_idx    on public.email_verifications(code);

-- ── pending_registrations: cadastros aguardando confirmação de email ──
-- O usuário SÓ vai para a tabela `users` depois de confirmar o email
create table public.pending_registrations (
  id                uuid        primary key default gen_random_uuid(),
  email             text        unique not null,
  password_hash     text        not null,
  name              text        not null,
  phone             text        not null default '',
  role              user_role   not null,
  city              text,
  notes             text,
  verification_code text        not null,
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now()
);
create index pending_registrations_email_idx on public.pending_registrations(email);

-- ── orders: pedidos dos compradores/produtores ─────────────────
create table public.orders (
  id           uuid         primary key default gen_random_uuid(),
  campaign_id  uuid         not null references public.campaigns(id) on delete cascade,
  buyer_id     uuid         not null references public.buyers(id) on delete cascade,
  lot_id       uuid         references public.campaign_lots(id) on delete set null,
  qty          integer      not null check (qty > 0),
  status       order_status not null default 'pending',
  submitted_at timestamptz  not null default now(),
  reviewed_at  timestamptz
);
create index orders_campaign_idx on public.orders(campaign_id);
create index orders_buyer_idx    on public.orders(buyer_id);
create index orders_status_idx   on public.orders(status);


-- ══════════════════════════════════════════════════════════════
-- PARTE 4: VIEWS
-- ══════════════════════════════════════════════════════════════

create view v_campaign_summary as
select
  c.id, c.pivo_id, c.slug, c.product, c.unit, c.unit_weight_kg,
  c.goal_qty, c.min_qty, c.price_per_unit,
  c.freight_total, c.markup_total, c.status, c.deadline, c.created_at,
  u.name as pivo_name,
  count(o.id)  filter (where o.status = 'approved')            as approved_count,
  coalesce(sum(o.qty) filter (where o.status = 'approved'), 0) as total_ordered,
  count(o.id)  filter (where o.status = 'pending')             as pending_count,
  case when c.goal_qty > 0
    then round(
      coalesce(sum(o.qty) filter (where o.status = 'approved'), 0)::numeric
      / c.goal_qty * 100, 1)
    else 0
  end as progress_pct,
  case when count(o.id) filter (where o.status = 'approved') > 0
    then c.freight_total / nullif(count(o.id) filter (where o.status = 'approved'), 0)
    else null
  end as freight_per_producer,
  case when count(o.id) filter (where o.status = 'approved') > 0
    then c.markup_total / nullif(count(o.id) filter (where o.status = 'approved'), 0)
    else null
  end as markup_per_producer
from public.campaigns c
join public.users u on u.id = c.pivo_id
left join public.orders o on o.campaign_id = c.id
group by c.id, u.name;

create view v_producer_costs as
select
  b.id              as buyer_id,
  b.name            as producer_name,
  b.phone,
  c.id              as campaign_id,
  c.product, c.unit,
  o.qty, o.status,
  cl.price_per_unit as lot_price,
  cl.freight        as lot_freight,
  cl.markup         as lot_markup,
  o.qty * coalesce(cl.price_per_unit, c.price_per_unit, 0) as subtotal
from public.orders o
join public.buyers b              on b.id = o.buyer_id
join public.campaigns c           on c.id = o.campaign_id
left join public.campaign_lots cl on cl.id = o.lot_id
where o.status = 'approved'
order by b.name, c.created_at;


-- ══════════════════════════════════════════════════════════════
-- PARTE 5: FUNÇÕES
-- ══════════════════════════════════════════════════════════════

create function find_or_create_buyer(p_name text, p_phone text)
returns uuid language plpgsql as $$
declare
  clean text := regexp_replace(p_phone, '\D', '', 'g');
  v_id  uuid;
begin
  select id into v_id from public.buyers where phone = clean;
  if not found then
    insert into public.buyers (name, phone)
    values (p_name, clean)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;


-- ══════════════════════════════════════════════════════════════
-- PARTE 6: DESABILITAR RLS
-- ══════════════════════════════════════════════════════════════

alter table public.users               disable row level security;
alter table public.vendors             disable row level security;
alter table public.campaigns           disable row level security;
alter table public.campaign_lots       disable row level security;
alter table public.products            disable row level security;
alter table public.product_promotions  disable row level security;
alter table public.orders              disable row level security;
alter table public.buyers              disable row level security;
alter table public.email_verifications disable row level security;
alter table public.pending_registrations disable row level security;


-- ══════════════════════════════════════════════════════════════
-- PARTE 7: IMPORTAR SUA CONTA DO SUPABASE AUTH
--
-- Importa automaticamente todas as contas que já existem no
-- Supabase Auth (incluindo sua conta oxentech) como admin.
-- Execute este bloco após as partes 1-6.
-- ══════════════════════════════════════════════════════════════

insert into public.users (
  id, email, email_verified, name, phone, password_hash, role, city, notes, active
)
select
  au.id,
  au.email,
  true,
  coalesce(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ),
  '',
  '',
  'admin',
  null,
  'Importado do Supabase Auth',
  true
from auth.users au
where au.email not in (select email from public.users)
  and au.email is not null;

-- Verificar resultado
select id, email, email_verified, role, active
from public.users
order by created_at;
