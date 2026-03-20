-- Adiciona campos para controlar publicação separada para compradores e fornecedores
ALTER TABLE campaigns 
ADD COLUMN published_to_buyers BOOLEAN DEFAULT FALSE,
ADD COLUMN published_to_vendors BOOLEAN DEFAULT FALSE;

-- Índices para melhor performance
CREATE INDEX idx_campaigns_published_buyers 
ON campaigns(pivo_id, published_to_buyers);

CREATE INDEX idx_campaigns_published_vendors 
ON campaigns(pivo_id, published_to_vendors);

-- Migração de dados existentes:
-- Campanhas com status 'open' = publicadas para compradores mas não para fornecedores
UPDATE campaigns 
SET published_to_buyers = TRUE, published_to_vendors = FALSE
WHERE status = 'open';

-- Campanhas com status 'negotiating' = publicadas para ambos
UPDATE campaigns 
SET published_to_buyers = TRUE, published_to_vendors = TRUE
WHERE status = 'negotiating';

-- Campanhas com status 'closed' ou 'finished' = não publicadas para ninguém
UPDATE campaigns 
SET published_to_buyers = FALSE, published_to_vendors = FALSE
WHERE status IN ('closed', 'finished');
