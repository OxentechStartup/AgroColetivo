-- Migração: Tornar campos do vendedor obrigatórios
-- Data: 2026-03-23
-- Descrição: Adiciona constraints NOT NULL aos campos phone, city e notes
--           para garantir que o perfil do vendedor está completo

-- ⚠️ ANTES DE EXECUTAR:
-- 1. Faça backup do banco de dados
-- 2. Se há vendors com campos vazios, execute primeiro:
--    UPDATE public.vendors SET phone = '', city = '', notes = '' WHERE phone IS NULL OR city IS NULL OR notes IS NULL;

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
