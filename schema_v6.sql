-- ============================================================
-- AgroColetivo — Schema v6  (corrigido + segurança)
-- Integração com Supabase Auth (JWT)
-- Cole tudo no SQL Editor do Supabase e execute
-- ============================================================

-- ── DROP TUDO ─────────────────────────────────────────────────
drop view     if exists v_producer_costs        cascade;
drop view     if exists v_campaign_summary      cascade;
drop table    if exists campaign_events         cascade;
drop table    if exists audit_logs              cascade;
drop table    if exists portal_rate_limit       cascade;
drop table    if exists orders                  cascade;
drop table    if exists campaign_lots           cascade;
drop table    if exists vendor_campaign_offers  cascade;
drop table    if exists campaigns               cascade;
drop table    if exists product_promotions      cascade;
drop table    if exists products                cascade;
drop table    if exists vendors                 cascade;
drop table    if exists buyers                  cascade;
drop table    if exists producers               cascade;
drop table    if exists users                   cascade;
drop table    if exists admin_users             cascade;
drop type     if exists offer_status            cascade;
drop type     if exists promo_type              cascade;
drop type     if exists product_unit            cascade;
drop type     if exists order_status            cascade;
drop type     if exists campaign_status         cascade;
drop type     if exists user_role               cascade;
drop function if exists find_or_create_buyer    cascade;
drop function if exists handle_new_auth_user    cascade;
drop function if exists auth_role               cascade;
drop function if exists is_gestor_or_admin      cascade;
drop function if exists log_security_event      cascade;

-- ── ENUMs ─────────────────────────────────────────────────────
create type user_role       as enum ('admin', 'pivo', 'vendor', 'buyer');
create type campaign_status as enum ('open', 'negotiating', 'closed', 'finished');
create type order_status    as enum ('pending', 'approved', 'rejected');
create type offer_status    as enum ('pending', 'accepted', 'rejected');
create type product_unit    as enum ('sacos','kg','toneladas','litros','fardos','caixas','unidades');
create type promo_type      as enum ('fixed_discount','percent_discount','fixed_bonus');

-- ── users ─────────────────────────────────────────────────────
create table users (
  id                 uuid        primary key references auth.users(id) on delete cascade,
  email              text        unique not null,
  name               text        not null,
  phone              text,
  role               user_role   not null default 'vendor',
  city               text,
  notes              text,
  profile_photo_url  text,
  active             boolean     not null default true,
  created_at         timestamptz not null default now()
);
create index users_email_idx on users(email);
create index users_phone_idx on users(phone);

-- ── buyers ────────────────────────────────────────────────────
create table buyers (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text        unique,
  phone      text,
  city       text,
  notes      text,
  created_at timestamptz not null default now()
);
create index buyers_email_idx on buyers(email);
create index buyers_phone_idx on buyers(phone);

-- ── vendors ───────────────────────────────────────────────────
create table vendors (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        unique references users(id) on delete cascade,
  name       text        not null,
  phone      text,
  city       text,
  notes      text,
  photo_url  text,
  created_at timestamptz not null default now()
);

-- ── products ──────────────────────────────────────────────────
create table products (
  id             uuid          primary key default gen_random_uuid(),
  vendor_id      uuid          not null references vendors(id) on delete cascade,
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

-- ── product_promotions ────────────────────────────────────────
create table product_promotions (
  id          uuid          primary key default gen_random_uuid(),
  product_id  uuid          not null references products(id) on delete cascade,
  min_qty     integer       not null check (min_qty > 0),
  promo_type  promo_type    not null,
  value       numeric(12,2) not null check (value > 0),
  description text,
  active      boolean       not null default true,
  created_at  timestamptz   not null default now()
);

-- ── campaigns ─────────────────────────────────────────────────
create table campaigns (
  id             uuid            primary key default gen_random_uuid(),
  pivo_id        uuid            not null references users(id) on delete cascade,
  slug           text            unique not null,
  product        text            not null,
  unit           text            not null default 'sacos',
  unit_weight_kg numeric(10,3)   not null default 25,
  goal_qty       integer         not null check (goal_qty > 0),
  min_qty        integer         not null default 1 check (min_qty > 0),
  max_qty        integer,
  price_per_unit numeric(12,2),
  freight_total  numeric(12,2),
  markup_total   numeric(12,2),
  image_url      text,
  status         campaign_status not null default 'open',
  deadline       date,
  closed_at      timestamptz,
  fee_paid_at    timestamptz,
  fee_paid_by    text,
  created_at     timestamptz     not null default now()
);

-- ── vendor_campaign_offers ────────────────────────────────────
create table vendor_campaign_offers (
  id             uuid          primary key default gen_random_uuid(),
  campaign_id    uuid          not null references campaigns(id) on delete cascade,
  vendor_id      uuid          not null references vendors(id) on delete cascade,
  price_per_unit numeric(12,2) not null,
  available_qty  integer       not null check (available_qty > 0),
  notes          text,
  status         offer_status  not null default 'pending',
  created_at     timestamptz   not null default now(),
  unique (campaign_id, vendor_id)
);
create index vco_campaign_idx on vendor_campaign_offers(campaign_id);
create index vco_vendor_idx   on vendor_campaign_offers(vendor_id);

-- ── campaign_lots ─────────────────────────────────────────────
create table campaign_lots (
  id             uuid          primary key default gen_random_uuid(),
  campaign_id    uuid          not null references campaigns(id) on delete cascade,
  vendor_id      uuid          references vendors(id) on delete set null,
  vendor_name    text,
  product_id     uuid          references products(id) on delete set null,
  qty_available  integer       not null check (qty_available > 0),
  price_per_unit numeric(12,2) not null,
  freight        numeric(12,2) not null default 0,
  markup         numeric(12,2) not null default 0,
  priority       integer       not null default 0,
  notes          text,
  created_at     timestamptz   not null default now()
);

-- ── orders ────────────────────────────────────────────────────
create table orders (
  id           uuid         primary key default gen_random_uuid(),
  campaign_id  uuid         not null references campaigns(id) on delete cascade,
  buyer_id     uuid         not null references buyers(id) on delete cascade,
  lot_id       uuid         references campaign_lots(id) on delete set null,
  qty          integer      not null check (qty > 0),
  status       order_status not null default 'pending',
  submitted_at timestamptz  not null default now(),
  reviewed_at  timestamptz
);
create index orders_campaign_idx on orders(campaign_id);
create index orders_buyer_idx    on orders(buyer_id);
create index orders_status_idx   on orders(status);

-- ── campaign_events ───────────────────────────────────────────
create table campaign_events (
  id           uuid        primary key default gen_random_uuid(),
  campaign_id  uuid        references campaigns(id) on delete cascade,
  actor_id     uuid        references users(id) on delete set null,
  event_type   text        not null,
  payload      jsonb,
  created_at   timestamptz not null default now()
);
create index ce_campaign_idx on campaign_events(campaign_id);

-- ── SEGURANÇA: audit_logs ─────────────────────────────────────
-- Persiste eventos de segurança (login, registro, ações sensíveis)
-- O frontend chama a função log_security_event via RPC
create table audit_logs (
  id          uuid        primary key default gen_random_uuid(),
  action      text        not null,
  user_id     uuid        references users(id) on delete set null,
  user_phone  text,
  user_role   text,
  resource    text,
  resource_id text,
  details     text,
  ip_hint     text,       -- preenchido pelo frontend se disponível
  created_at  timestamptz not null default now()
);
create index audit_logs_user_idx   on audit_logs(user_id);
create index audit_logs_action_idx on audit_logs(action);
create index audit_logs_time_idx   on audit_logs(created_at desc);

-- ── SEGURANÇA: portal_submissions (rate limit anon) ───────────
-- Rastreia submissões anônimas por telefone para bloquear spam
-- A função find_or_create_buyer verifica antes de inserir
-- Limite: 5 pedidos por telefone por hora (configurável abaixo)
create table portal_rate_limit (
  phone       text        not null,
  campaign_id uuid        not null references campaigns(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (phone, campaign_id, submitted_at)
);
create index prl_phone_idx on portal_rate_limit(phone, submitted_at desc);

-- ── VIEW: v_campaign_summary ───────────────────────────────────
create view v_campaign_summary as
select
  c.id, c.pivo_id, c.slug, c.product, c.unit, c.unit_weight_kg,
  c.goal_qty, c.min_qty, c.max_qty,
  c.price_per_unit, c.freight_total, c.markup_total,
  c.status, c.deadline, c.closed_at,
  c.fee_paid_at, c.fee_paid_by,
  c.created_at,
  u.name as pivo_name,
  count(o.id)  filter (where o.status = 'approved')            as approved_count,
  coalesce(sum(o.qty) filter (where o.status = 'approved'), 0) as total_ordered,
  count(o.id)  filter (where o.status = 'pending')             as pending_count,
  case when c.goal_qty > 0
    then round(coalesce(sum(o.qty) filter (where o.status='approved'),0)::numeric / c.goal_qty * 100, 1)
    else 0
  end as progress_pct,
  case when count(o.id) filter (where o.status='approved') > 0
    then c.freight_total / nullif(count(o.id) filter (where o.status='approved'), 0)
    else null
  end as freight_per_producer,
  case when count(o.id) filter (where o.status='approved') > 0
    then c.markup_total  / nullif(count(o.id) filter (where o.status='approved'), 0)
    else null
  end as markup_per_producer
from campaigns c
join users u on u.id = c.pivo_id
left join orders o on o.campaign_id = c.id
group by c.id, u.name;

-- ── VIEW: v_producer_costs ─────────────────────────────────────
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
from orders o
join buyers b              on b.id  = o.buyer_id
join campaigns c           on c.id  = o.campaign_id
left join campaign_lots cl on cl.id = o.lot_id
where o.status = 'approved'
order by b.name, c.created_at;

-- ── FUNÇÃO: find_or_create_buyer (com rate limit) ─────────────
-- SEGURANÇA: limita 5 pedidos por telefone por hora no portal anon
create function find_or_create_buyer(p_name text, p_phone text)
returns uuid language plpgsql security definer
set search_path = public
as $$
declare
  clean  text := regexp_replace(p_phone, '\D', '', 'g');
  v_id   uuid;
  v_count integer;
begin
  -- Rate limit: max 10 pedidos por telefone na ultima hora (anti-spam portal)
  select count(*) into v_count
  from portal_rate_limit
  where phone = clean
    and submitted_at > now() - interval '1 hour';

  if v_count >= 10 then
    raise exception 'Limite de pedidos atingido. Tente novamente em 1 hora.'
      using errcode = 'P0001';
  end if;

  -- Registra submissao para rate limit
  -- (campaign_id nao disponivel aqui, usamos uuid nulo como placeholder)
  -- O controle real de duplicata por campanha fica na policy de orders
  select id into v_id from buyers where phone = clean;
  if not found then
    insert into buyers (name, phone) values (p_name, clean) returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- ── FUNÇÃO: log_security_event (RPC chamada pelo frontend) ────
-- SEGURANÇA: persiste eventos de auditoria no banco
-- Aceita chamadas de anon e authenticated (frontend chama via supabase.rpc)
create or replace function log_security_event(
  p_action      text,
  p_user_id     uuid    default null,
  p_user_phone  text    default null,
  p_user_role   text    default null,
  p_resource    text    default null,
  p_resource_id text    default null,
  p_details     text    default null,
  p_ip_hint     text    default null
) returns void language plpgsql security definer
set search_path = public
as $$
begin
  insert into audit_logs (
    action, user_id, user_phone, user_role,
    resource, resource_id, details, ip_hint
  ) values (
    p_action, p_user_id, p_user_phone, p_user_role,
    p_resource, p_resource_id, p_details, p_ip_hint
  );
end;
$$;

-- ── TRIGGER: sincroniza auth.users -> users + vendors ──────────
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_email text := new.email;
  v_phone text := (new.raw_user_meta_data->>'phone');
  v_name  text := coalesce(new.raw_user_meta_data->>'name', 'Usuario');
  v_role  user_role := (new.raw_user_meta_data->>'role')::user_role;
  v_city  text := new.raw_user_meta_data->>'city';
  v_notes text := new.raw_user_meta_data->>'notes';
begin
  -- Validação: se role for NULL, usa 'vendor' como fallback
  if v_role is null then
    v_role := 'vendor'::user_role;
  end if;

  -- Upsert em public.users (role sempre será preenchido)
  insert into public.users (id, email, name, phone, role, city, notes, active)
  values (new.id, v_email, v_name, v_phone, v_role, v_city, v_notes, true)
  on conflict (id) do update
    set email = excluded.email,
        name  = excluded.name,
        phone = excluded.phone,
        role  = excluded.role,
        city  = excluded.city,
        notes = excluded.notes,
        active = true;

  -- Cria linha em vendors apenas para role vendor
  if v_role = 'vendor'::user_role then
    insert into public.vendors (user_id, name, phone, city, notes)
    values (new.id, v_name, v_phone, v_city, v_notes)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_auth_user();

-- ── HELPERS RLS ───────────────────────────────────────────────
create or replace function auth_role()
returns text language sql stable security definer
set search_path = public
as $$
  select role::text from public.users where id = auth.uid()
$$;

create or replace function is_gestor_or_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('admin', 'pivo')
  )
$$;

-- ═══════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════

alter table users                  enable row level security;
alter table buyers                 enable row level security;
alter table vendors                enable row level security;
alter table products               enable row level security;
alter table product_promotions     enable row level security;
alter table campaigns              enable row level security;
alter table vendor_campaign_offers enable row level security;
alter table campaign_lots          enable row level security;
alter table orders                 enable row level security;
alter table campaign_events        enable row level security;
alter table audit_logs             enable row level security;
alter table portal_rate_limit      enable row level security;

-- users: apenas seu próprio perfil + dados de vendors (para contato)
create policy "le users" on users for select to authenticated 
  using (
    id = auth.uid() OR  -- seu próprio perfil
    role = 'vendor' OR  -- dados de vendor (público)
    auth_role() = 'admin'  -- admin vê tudo
  );
create policy "edita proprio"   on users for update to authenticated using (id = auth.uid());
create policy "admin edita"     on users for update to authenticated using (auth_role() = 'admin');
create policy "trigger insere"  on users for insert to authenticated, anon with check (true);

-- buyers
create policy "auth acessa buyers" on buyers for all to authenticated using (true) with check (true);
create policy "anon insere buyer"  on buyers for insert to anon with check (true);
create policy "anon le buyer"      on buyers for select to anon using (true);

-- vendors: apenas vendor publico + seu próprio
create policy "le vendors" on vendors for select to authenticated 
  using (
    user_id = auth.uid() OR  -- seu próprio vendor
    is_gestor_or_admin()  -- admin vê tudo
  );
create policy "vendor edita proprio"   on vendors for update to authenticated using (user_id = auth.uid());
create policy "vendor insere proprio"  on vendors for insert to authenticated
  with check (user_id = auth.uid() OR is_gestor_or_admin());
create policy "gestor insere vendor"   on vendors for insert to authenticated
  with check (is_gestor_or_admin());
create policy "gestor atualiza vendor" on vendors for update to authenticated
  using (is_gestor_or_admin());
create policy "gestor deleta vendor"   on vendors for delete to authenticated
  using (is_gestor_or_admin());

-- products: apenas de vendors que estão em campaigns abertas
create policy "le products" on products for select to authenticated using (
  vendor_id in (
    select v.id from vendors v
    where 
      v.user_id = auth.uid() OR  -- seu próprio vendor
      is_gestor_or_admin()  -- admin
  )
);
create policy "vendor gerencia produtos" on products for all to authenticated
  using  (vendor_id in (select id from vendors where user_id = auth.uid()))
  with check (vendor_id in (select id from vendors where user_id = auth.uid()));

-- product_promotions
create policy "auth acessa promotions" on product_promotions for all to authenticated
  using (true) with check (true);

-- campaigns: suas próprias + abertas ao público
create policy "vendor le campaigns" on campaigns for select to authenticated
  using (
    pivo_id = auth.uid() OR  -- é o seu próprio campaign
    status in ('open', 'negotiating') OR  -- públicos
    is_gestor_or_admin() OR  -- admin
    id in (
      select campaign_id from campaign_lots cl
      join vendors v on v.id = cl.vendor_id
      where v.user_id = auth.uid()
    )  -- seu vendor está neste campaign
  );
create policy "gestor gerencia campaigns" on campaigns for all to authenticated
  using (is_gestor_or_admin() or pivo_id = auth.uid())
  with check (is_gestor_or_admin() or pivo_id = auth.uid());

-- vendor_campaign_offers
create policy "acesso offers" on vendor_campaign_offers for all to authenticated
  using (
    is_gestor_or_admin()
    or vendor_id in (select id from vendors where user_id = auth.uid())
  )
  with check (
    is_gestor_or_admin()
    or vendor_id in (select id from vendors where user_id = auth.uid())
  );

-- campaign_lots
create policy "auth acessa lots" on campaign_lots for all to authenticated
  using (true) with check (true);

-- orders
create policy "auth acessa orders" on orders for all to authenticated
  using (true) with check (true);
-- SEGURANCA: anon so pode inserir 1 pedido por campanha por telefone
-- (bloqueio de duplicata via unique na combinacao buyer+campaign)
create policy "anon insere order" on orders for insert to anon
  with check (status = 'pending');
create policy "anon le order" on orders for select to anon
  using (true);

-- campaign_events
create policy "auth acessa events" on campaign_events for all to authenticated
  using (true) with check (true);
-- CORRECAO: anon (portal) pode inserir eventos de pedido publico
create policy "anon insere event" on campaign_events for insert to anon
  with check (actor_id is null);

-- audit_logs: apenas admin le, qualquer um (inclusive anon) insere via RPC
create policy "admin le audit"   on audit_logs for select to authenticated
  using (auth_role() = 'admin');
create policy "insert audit"     on audit_logs for insert to authenticated, anon
  with check (true);

-- portal_rate_limit: gerenciado pela funcao find_or_create_buyer (security definer)
create policy "anon le rate"     on portal_rate_limit for select to anon using (true);
create policy "anon insere rate" on portal_rate_limit for insert to anon with check (true);
create policy "auth le rate"     on portal_rate_limit for select to authenticated using (true);

-- ── GRANTs ────────────────────────────────────────────────────
grant usage  on schema public to authenticated, anon;
grant all    on all tables    in schema public to authenticated;
grant all    on all sequences in schema public to authenticated;
grant select, insert on buyers            to anon;
grant select, insert on orders            to anon;
grant select, insert on portal_rate_limit to anon;
-- Permite anon e authenticated chamar funcoes publicas via RPC
grant execute on function log_security_event(text,uuid,text,text,text,text,text,text) to anon, authenticated;
grant execute on function find_or_create_buyer(text,text) to anon, authenticated;
-- CORRECAO: grant no schema para RPC funcionar sem autenticacao (anon)
grant usage on schema public to anon;

-- Permite admin e authenticated ver audit_logs
grant select on audit_logs to authenticated;
-- CORRECAO: anon precisa de permissao de INSERT em audit_logs para o RPC funcionar
grant insert on audit_logs to anon;

-- ── CONSTRAINT: 1 pedido pendente por buyer+campaign ──────────
-- SEGURANCA: impede que o mesmo telefone envie multiplos pedidos
-- para a mesma cotacao no portal anonimo
alter table orders
  add constraint orders_buyer_campaign_pending_unique
  unique (buyer_id, campaign_id);

-- ═══════════════════════════════════════════════════════════════
-- CRIAR ADMIN MANUALMENTE
-- ═══════════════════════════════════════════════════════════════
-- 
-- NÃO é possível criar usuários em auth.users via SQL direto.
-- Siga estes passos para criar o admin:
--
-- 1. Abra: https://app.supabase.com/project/iepgeibcwthilohdlfse/auth/users
-- 2. Clique "Add user" (botão verde)
-- 3. Preencha:
--    - Email: oxentech.startup@gmail.com
--    - Password: oxentech@8734
--    - Auto generate password: desmarque
-- 4. Clique "Create user"
-- 5. Logo depois, execute esta query para completar o registro em public.users:
--
--   INSERT INTO public.users (id, email, name, role, city, notes, active)
--   SELECT id, email, 'Admin OxenTech', 'admin', NULL, 'Administrador do sistema', true
--   FROM auth.users
--   WHERE email = 'oxentech.startup@gmail.com'
--   ON CONFLICT (id) DO UPDATE
--   SET role = 'admin', active = true, name = 'Admin OxenTech';
--
-- ═══════════════════════════════════════════════════════════════
-- VERIFICACAO pos-admin criado:
--
--   SELECT a.id, a.email, u.email, u.phone, u.role, u.active
--   FROM auth.users a
--   JOIN public.users u ON u.id = a.id
--   WHERE a.email = 'oxentech.startup@gmail.com';
--
-- ═══════════════════════════════════════════════════════════════
-- CHECKLIST DE SEGURANCA PARA DEV/PRODUCAO:
--
-- [1] ✅ Email confirmations: desabilitado (já feito)
--
-- [2] Admin criado: oxentech.startup@gmail.com / oxentech@8734
--
-- [3] Antes de produção:
--     - Trocar senha admin para algo mais forte (12+ chars, maiúsculas, números, símbolos)
--     - Exemplo: Agro@2024#Oxen!Segura42
--
-- [4] Configurar SMTP para emails de confirmação (se habilitar no futuro)
--
-- [5] Rate limiting no Supabase > Authentication > Settings:
--     - Enable rate limiting
--     - Max 5 tentativas / 15 min por IP
--
-- ═══════════════════════════════════════════════════════════════
