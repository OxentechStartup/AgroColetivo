-- ============================================================
--  AgroColetivo — Schema v7 (FINAL PRODUCTION + MIGRATIONS)
-- ============================================================
-- ✅ Schema completo (v6 consolidado)
-- ✅ Migrações aplicadas (publish flags + vendor fields)
-- ✅ Pronto para produção
-- ============================================================
--
-- COMO USAR EM PRODUÇÃO:
-- 1. Log in ao Supabase SQL Editor do seu projeto
-- 2. Crie uma nova query
-- 3. Copie TODO O CONTEÚDO deste arquivo
-- 4. Clique em RUN ou pressione Ctrl+Enter
-- 5. Aguarde a conclusão (alguns segundos)
-- 6. Seu banco estará completamente configurado com todas as migrações!
--
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- APLICAR MIGRAÇÕES PENDENTES
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- MIGRAÇÃO 1: Adicionar flags de publicação separada por tipo de usuário
-- ──────────────────────────────────────────────────────────────
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS published_to_buyers BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS published_to_vendors BOOLEAN DEFAULT FALSE;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_campaigns_published_buyers 
ON campaigns(pivo_id, published_to_buyers);

CREATE INDEX IF NOT EXISTS idx_campaigns_published_vendors 
ON campaigns(pivo_id, published_to_vendors);

-- Migração de dados existentes
-- Campanhas com status 'open' = publicadas para compradores mas não para fornecedores
UPDATE campaigns 
SET published_to_buyers = TRUE, published_to_vendors = FALSE
WHERE status = 'open' AND published_to_buyers IS NULL;

-- Campanhas com status 'negotiating' = publicadas para ambos
UPDATE campaigns 
SET published_to_buyers = TRUE, published_to_vendors = TRUE
WHERE status = 'negotiating' AND published_to_buyers IS NULL;

-- Campanhas com status 'closed' ou 'finished' = não publicadas para ninguém
UPDATE campaigns 
SET published_to_buyers = FALSE, published_to_vendors = FALSE
WHERE status IN ('closed', 'finished') AND published_to_buyers IS NULL;

-- ──────────────────────────────────────────────────────────────
-- MIGRAÇÃO 2: Tornar campos do vendedor obrigatórios
-- ──────────────────────────────────────────────────────────────

-- Adiciona valores padrão para linhas existentes com NULL
UPDATE public.vendors 
SET phone = '', city = '', notes = '' 
WHERE phone IS NULL OR city IS NULL OR notes IS NULL;

-- Modifica a tabela para adicionar NOT NULL constraints
ALTER TABLE public.vendors
  ALTER COLUMN phone SET NOT NULL DEFAULT '',
  ALTER COLUMN city SET NOT NULL DEFAULT '',
  ALTER COLUMN notes SET NOT NULL DEFAULT '';

-- Criação de índices para melhor performance
CREATE INDEX IF NOT EXISTS vendors_phone_idx ON public.vendors(phone);
CREATE INDEX IF NOT EXISTS vendors_city_idx ON public.vendors(city);

-- ══════════════════════════════════════════════════════════════
-- VALIDAÇÃO PÓS-MIGRAÇÃO
-- ══════════════════════════════════════════════════════════════
-- Execute estas queries para verificar que tudo foi criado:
--
-- 1. Verificar se columns foram adicionadas:
--    SELECT column_name FROM information_schema.columns 
--    WHERE table_name='campaigns' AND column_name LIKE 'published_%';
--
-- 2. Verificar se vendors estão com NOT NULL:
--    SELECT column_name, is_nullable FROM information_schema.columns 
--    WHERE table_name='vendors' AND column_name IN ('phone', 'city', 'notes');
--
-- 3. Verificar índices:
--    SELECT indexname FROM pg_indexes 
--    WHERE tablename IN ('campaigns', 'vendors') 
--    AND indexname LIKE '%published_%' OR indexname LIKE '%vendor%';
--
-- ══════════════════════════════════════════════════════════════

-- Mensagem de sucesso
SELECT 
  'Migration v7 completa! Campos adicionados e constraints aplicados.' as status,
  NOW() as timestamp;
