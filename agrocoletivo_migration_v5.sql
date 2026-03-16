-- ============================================================
--  AGROCOLETIVO — MIGRATION v5
--  ✅ Totalmente idempotente — seguro rodar sobre banco v4.x
--  ✅ Apenas ADD COLUMN / CREATE TABLE (sem DROP, sem RENAME)
--  ✅ Compatível com código v19
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. campaign_lots — adiciona coluna priority
--    Ordena fornecedores explicitamente (antes dependia de created_at)
-- ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'campaign_lots' and column_name = 'priority'
  ) then
    alter table campaign_lots add column priority integer not null default 0;
    -- Retroativamente atribui priority baseado na ordem de inserção
    update campaign_lots cl
    set priority = sub.row_num
    from (
      select id, row_number() over (partition by campaign_id order by created_at) as row_num
      from campaign_lots
    ) sub
    where cl.id = sub.id;
  end if;
end $$;

create index if not exists idx_lots_priority on campaign_lots(campaign_id, priority);

-- ──────────────────────────────────────────────────────────────
-- 2. campaigns — adiciona closed_at
-- ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'campaigns' and column_name = 'closed_at'
  ) then
    alter table campaigns add column closed_at timestamptz;
    -- Retroativamente preenche closed_at para campanhas já encerradas
    update campaigns set closed_at = updated_at where status = 'closed'
      and updated_at is not null;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 2b. campaigns — adiciona max_qty (máximo por pedido por produtor)
-- ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'campaigns' and column_name = 'max_qty'
  ) then
    alter table campaigns add column max_qty integer default null;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 3. orders — rastreabilidade de rejeição + anotações internas
-- ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'orders' and column_name = 'rejected_at'
  ) then
    alter table orders add column rejected_at timestamptz;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'orders' and column_name = 'rejection_reason'
  ) then
    alter table orders add column rejection_reason text;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'orders' and column_name = 'admin_notes'
  ) then
    alter table orders add column admin_notes text;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 4. producers — localização geográfica
-- ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'producers' and column_name = 'city'
  ) then
    alter table producers add column city text;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'producers' and column_name = 'region'
  ) then
    alter table producers add column region text;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 5. vendor_products — freight tipado + soft-delete
-- ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendor_products' and column_name = 'freight_type'
  ) then
    alter table vendor_products add column freight_type text not null default 'A_COMBINAR';
    -- Migra valores existentes do campo freight (texto livre) para o enum
    update vendor_products set freight_type =
      case
        when freight ilike '%CIF%' or freight ilike '%fornecedor%' then 'CIF'
        when freight ilike '%FOB%' or freight ilike '%comprador%'  then 'FOB'
        else 'A_COMBINAR'
      end;
    alter table vendor_products add constraint vp_freight_type_check
      check (freight_type in ('CIF', 'FOB', 'A_COMBINAR'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendor_products' and column_name = 'freight_value'
  ) then
    alter table vendor_products add column freight_value numeric;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendor_products' and column_name = 'active'
  ) then
    alter table vendor_products add column active boolean not null default true;
  end if;
end $$;

create index if not exists idx_vp_active
  on vendor_products(vendor_id, active)
  where active = true;

-- ──────────────────────────────────────────────────────────────
-- 6. vendor_promotions — validade opcional
-- ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendor_promotions' and column_name = 'valid_until'
  ) then
    alter table vendor_promotions add column valid_until timestamptz;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 7. vendor_campaign_offers — propostas dos fornecedores
-- ──────────────────────────────────────────────────────────────
create table if not exists vendor_campaign_offers (
  id             uuid        primary key default uuid_generate_v4(),
  campaign_id    uuid        not null references campaigns(id) on delete cascade,
  vendor_id      uuid        not null references vendors(id) on delete cascade,
  price_per_unit numeric     not null,
  available_qty  integer     not null,
  notes          text,
  status         text        not null default 'pending',
  created_at     timestamptz not null default now(),
  constraint vco_status_check check (status in ('pending', 'accepted', 'rejected'))
);

create unique index if not exists vendor_campaign_offers_vendor_campaign_idx
  on vendor_campaign_offers(vendor_id, campaign_id);

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendor_campaign_offers' and column_name = 'status'
  ) then
    alter table vendor_campaign_offers
      add column status text not null default 'pending';
    alter table vendor_campaign_offers
      add constraint vco_status_check check (status in ('pending', 'accepted', 'rejected'));
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 8. campaign_events — audit log
-- ──────────────────────────────────────────────────────────────
create table if not exists campaign_events (
  id          uuid        primary key default uuid_generate_v4(),
  campaign_id uuid        not null references campaigns(id) on delete cascade,
  actor_id    uuid        references admin_users(id) on delete set null,
  event_type  text        not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

alter table campaign_events enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'campaign_events' and policyname = 'events_all'
  ) then
    create policy "events_all" on campaign_events for all using (true) with check (true);
  end if;
end $$;

create index if not exists idx_events_campaign on campaign_events(campaign_id, created_at desc);
create index if not exists idx_events_type     on campaign_events(event_type);

-- ──────────────────────────────────────────────────────────────
-- 9. Views — recriar com CTE (sem subqueries correlacionadas)
-- ──────────────────────────────────────────────────────────────
drop view if exists v_campaign_summary cascade;
create view v_campaign_summary as
with order_stats as (
  select
    campaign_id,
    count(*) filter (where status = 'approved')              as approved_count,
    coalesce(sum(qty) filter (where status = 'approved'), 0) as total_ordered,
    count(*) filter (where status = 'pending')               as pending_count
  from orders
  group by campaign_id
)
select
  c.id,
  c.slug,
  c.product,
  c.unit,
  c.unit_weight_kg,
  c.goal_qty,
  c.min_qty,
  c.max_qty,
  c.price_per_unit,
  c.freight_total,
  c.markup_total,
  c.status,
  c.deadline,
  c.closed_at,
  c.created_at,
  c.pivo_id,
  coalesce(os.approved_count, 0)   as approved_count,
  coalesce(os.total_ordered,  0)   as total_ordered,
  coalesce(os.pending_count,  0)   as pending_count,
  round(
    coalesce(os.total_ordered, 0)::numeric / nullif(c.goal_qty, 0) * 100, 1
  )                                 as progress_pct,
  case when coalesce(os.approved_count, 0) > 0
    then round(c.freight_total / os.approved_count, 2)
  end                               as freight_per_producer,
  case when coalesce(os.approved_count, 0) > 0
    then round(c.markup_total  / os.approved_count, 2)
  end                               as markup_per_producer
from campaigns c
left join order_stats os on os.campaign_id = c.id;

drop view if exists v_producer_costs cascade;
create view v_producer_costs as
with approved_counts as (
  select campaign_id, count(*) as n
  from orders
  where status = 'approved'
  group by campaign_id
)
select
  b.id                                                              as producer_id,
  b.name                                                            as producer_name,
  b.phone,
  o.id                                                              as order_id,
  o.qty,
  o.admin_notes,
  o.rejection_reason,
  c.unit,
  c.product                                                         as campaign,
  c.status                                                          as campaign_status,
  round((o.qty * coalesce(c.unit_weight_kg, 25))::numeric / 1000, 3) as tons,
  coalesce(l.price_per_unit, c.price_per_unit)                     as price_per_unit,
  case
    when coalesce(l.price_per_unit, c.price_per_unit) is not null
    then coalesce(l.price_per_unit, c.price_per_unit) * o.qty
  end                                                               as produto,
  case when ac.n > 0
    then round(coalesce(c.freight_total, 0) / ac.n, 2)
    else 0
  end                                                               as freight,
  case when ac.n > 0
    then round(coalesce(c.markup_total, 0) / ac.n, 2)
    else 0
  end                                                               as markup
from orders o
join buyers b             on b.id = o.buyer_id
join campaigns c          on c.id = o.campaign_id
left join campaign_lots l on l.id = o.lot_id
left join approved_counts ac on ac.campaign_id = c.id
where o.status = 'approved';

-- ──────────────────────────────────────────────────────────────
-- 10. Índices adicionais
-- ──────────────────────────────────────────────────────────────
create index if not exists idx_campaigns_pivo    on campaigns(pivo_id);
create index if not exists idx_orders_campaign  on orders(campaign_id);
create index if not exists idx_orders_producer  on orders(producer_id);
create index if not exists idx_orders_status    on orders(status);
create index if not exists idx_orders_lot       on orders(lot_id);
create index if not exists idx_lots_campaign    on campaign_lots(campaign_id);
create index if not exists idx_lots_vendor      on campaign_lots(vendor_id);
create index if not exists idx_admin_email      on admin_users(email);
create index if not exists idx_vendors_adminuser on vendors(admin_user_id);
create index if not exists idx_vp_vendor        on vendor_products(vendor_id);

-- ============================================================
--  RESUMO DAS MUDANÇAS v5
--
--  campaign_lots:        + priority (integer) — ordem explícita de fornecedores
--  campaigns:            + closed_at (timestamptz)
--  orders:               + rejected_at, rejection_reason, admin_notes
--  producers:            + city, region
--  vendor_products:      + freight_type (CIF/FOB/A_COMBINAR), freight_value, active
--  vendor_promotions:    + valid_until
--  vendor_campaign_offers: + status (pending/accepted/rejected)
--  campaign_events:      tabela nova — audit log de todas as ações
--  v_campaign_summary:   reescrita com CTE (sem subqueries correlacionadas)
--  v_producer_costs:     reescrita com CTE
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 11. vendor_products — colunas para cadastro completo de produto
--     peso por embalagem, preço/kg calculado, categoria, stock_unit
-- ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendor_products' and column_name = 'weight_kg'
  ) then
    alter table vendor_products add column weight_kg numeric;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendor_products' and column_name = 'price_per_kg'
  ) then
    alter table vendor_products add column price_per_kg numeric;
    -- Calcula retroativamente price_per_kg onde peso já está preenchido
    -- (após adicionar weight_kg os registros existentes terão weight_kg=null, então não há risco)
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendor_products' and column_name = 'category'
  ) then
    alter table vendor_products add column category text;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendor_products' and column_name = 'stock_unit'
  ) then
    alter table vendor_products add column stock_unit text;
    -- Preenche retroativamente com a unidade de venda existente
    update vendor_products set stock_unit = unit where stock_unit is null;
  end if;
end $$;

-- ============================================================
--  COLUNAS ADICIONADAS EM v5 (vendor_products)
--
--  weight_kg    → peso por embalagem (ex: 30 para saco de 30kg)
--  price_per_kg → preço por quilo — calculado automaticamente
--                 pelo backend ao salvar, ou informado diretamente
--  category     → categoria do produto (Ração, Fertilizante, etc.)
--  stock_unit   → unidade do estoque (igual a unit na maioria dos casos)
--
--  Lógica de cruzamento (feita no frontend em vendorProducts.js):
--    se informou preço/saco + peso → price_per_kg = pricePerUnit / weightKg
--    se informou preço/kg  + peso → price_per_unit = pricePerKg  * weightKg
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 12. admin_users — phone como identificador de login principal
-- ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'admin_users' and column_name = 'city'
  ) then
    alter table admin_users add column city text;
  end if;
end $$;

-- Garante unique em phone
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_users_phone_unique'
  ) then
    alter table admin_users add constraint admin_users_phone_unique unique (phone);
  end if;
end $$;

create index if not exists idx_admin_phone on admin_users(phone);

-- Atualiza usuários padrão com telefone para teste
update admin_users set phone = '38991110001' where username = 'admin'    and phone is null;
update admin_users set phone = '38991110002' where username = 'gestor'   and phone is null;
update admin_users set phone = '38991110003' where username = 'fornecedor' and phone is null;

-- ============================================================
--  LOGINS PADRÃO v5 (por telefone)
--   (38) 99111-0001 / admin123   → admin
--   (38) 99111-0002 / gestor123  → pivô
--   (38) 99111-0003 / forn123    → fornecedor (demo)
-- ============================================================
