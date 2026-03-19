-- ============================================================
-- Migração: Adicionar column image_url na tabela campaigns
-- ============================================================

-- Adicionar coluna image_url na tabela campaigns
ALTER TABLE public.campaigns ADD COLUMN image_url text;

-- Recriar a view v_campaign_summary para incluir image_url
DROP VIEW IF EXISTS v_campaign_summary CASCADE;

CREATE VIEW v_campaign_summary AS
SELECT
  c.id, c.pivo_id, c.slug, c.product, c.unit, c.unit_weight_kg,
  c.goal_qty, c.min_qty, c.price_per_unit,
  c.freight_total, c.markup_total, c.status, c.deadline, c.created_at,
  c.image_url,
  u.name AS pivo_name,
  COUNT(o.id) FILTER (WHERE o.status = 'approved') AS approved_count,
  COALESCE(SUM(o.qty) FILTER (WHERE o.status = 'approved'), 0) AS total_ordered,
  COUNT(o.id) FILTER (WHERE o.status = 'pending') AS pending_count,
  CASE WHEN c.goal_qty > 0
    THEN ROUND(
      COALESCE(SUM(o.qty) FILTER (WHERE o.status = 'approved'), 0)::NUMERIC
      / c.goal_qty * 100, 1)
    ELSE 0
  END AS progress_pct,
  CASE WHEN COUNT(o.id) FILTER (WHERE o.status = 'approved') > 0
    THEN c.freight_total / NULLIF(COUNT(o.id) FILTER (WHERE o.status = 'approved'), 0)
    ELSE NULL
  END AS freight_per_producer,
  CASE WHEN COUNT(o.id) FILTER (WHERE o.status = 'approved') > 0
    THEN c.markup_total / NULLIF(COUNT(o.id) FILTER (WHERE o.status = 'approved'), 0)
    ELSE NULL
  END AS markup_per_producer
FROM public.campaigns c
JOIN public.users u ON u.id = c.pivo_id
LEFT JOIN public.orders o ON o.campaign_id = c.id
GROUP BY c.id, u.name, c.image_url;
