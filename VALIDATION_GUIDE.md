# 🧪 Validação do Sistema AgroColetivo

Este documento descreve como validar se **todas as ações do sistema funcionam normalmente com o banco de dados**.

## ✅ O que Está Validado

### 1. **Conectividade**
- ✅ Conexão com Supabase
- ✅ Credenciais configuradas corretamente
- ✅ Autenticação funcionando

### 2. **Estrutura do Banco**
- ✅ Tabelas obrigatórias existem:
  - `users` - usuários do sistema
  - `vendors` - fornecedores
  - `campaigns` - campanhas/cotações
  - `campaign_lots` - lotes de campanha
  - `products` - produtos
  - `vendor_products` - produtos de vendor
  - `offers` - ofertas
  - `events` - eventos de auditoria

### 3. **Colunas Críticas**
- ✅ `vendors.photo_url` - coluna para armazenar Data URI da foto
- ✅ `users.role` - coluna para role do usuário
- ✅ Todas as colunas obrigatórias presentes

### 4. **Operações Principais**
- ✅ `fetchVendors()` - buscar fornecedores
- ✅ `fetchCampaigns()` - buscar campanhas
- ✅ `fetchAllProducts()` - buscar produtos
- ✅ Retornam arrays com estrutura correta

### 5. **Validações**
- ✅ Upload de imagens (JPEG, PNG, WebP)
- ✅ Rejeição de formatos inválidos
- ✅ Validação de tamanho de arquivo (máx 5MB)

### 6. **Integridade de Dados**
- ✅ Referências estrangeiras (FKs) intactas
- ✅ `campaign_lots.vendor_id` → `vendors.id`
- ✅ `campaign_lots.campaign_id` → `campaigns.id`

### 7. **Segurança**
- ✅ RLS (Row Level Security) ativo
- ✅ Bloqueio de acesso não autenticado
- ✅ Proteção contra acesso cruzado

### 8. **Funcionalidade de Imagem**
- ✅ Data URI (base64) funciona corretamente
- ✅ Não usa blob:// (persiste após reload)
- ✅ Fotos armazenadas como string no banco

## 🚀 Como Usar

### Opção 1: Rodar Testes Automaticamente (RECOMENDADO)

1. **Abra a aplicação em produção:**
   ```
   https://agro-coletivo.vercel.app/test
   ```

2. **Clique em "Executar Validação Completa"**

3. **Aguarde os resultados:**
   - Verde = ✅ Passou
   - Vermelho = ❌ Falhou
   - Total deve ser **todos verdes**

### Opção 2: Testar Funções Específicas (Manual)

Abra o Console do Navegador (F12) e rode:

```javascript
// Testar busca de vendors
const { default: vendors } = await import('/src/lib/vendors.js');
const v = await vendors.fetchVendors(null, 'admin');
console.log('Vendors:', v);

// Testar busca de campanhas
const { default: campaigns } = await import('/src/lib/campaigns.js');
const c = await campaigns.fetchCampaigns({ role: 'admin' });
console.log('Campanhas:', c);

// Testar busca de produtos
const { default: products } = await import('/src/lib/products.js');
const p = await products.fetchAllProducts();
console.log('Produtos:', p);
```

## 🔍 Interpretando Resultados

### Exemplo de Resultado Positivo:
```
✅ Conectado ao Supabase com sucesso
✅ Tabela 'users' encontrada
✅ Tabela 'vendors' encontrada
✅ Coluna 'vendors.photo_url' existe
✅ fetchVendors() retornou array (5 itens)
✅ Estrutura de vendor está correta
...

✨ TODOS OS TESTES PASSARAM!
Total: 42 | Passou: 42 | Falhou: 0
```

### Exemplo de Falha:
```
❌ Conexão com banco
   └─ Error: Invalid credentials

❌ Tabela 'vendors' não encontrada
   └─ Error: schema_v6 was not applied

❌ Data URI gerada corretamente
   └─ Error: undefined function
```

## 🛠️ Se Algo Falhar

### Falha: "Conexão com banco"
**Solução:**
1. Verifique `.env`:
   ```
   VITE_SUPABASE_URL=https://...supabase.co
   VITE_SUPABASE_KEY=...
   ```
2. Teste credenciais no Supabase Dashboard
3. Verifique se o projeto Supabase está ativo

### Falha: "Tabela não encontrada"
**Solução:**
1. Abra Supabase Dashboard → SQL Editor
2. Execute schema_v6.sql:
   ```sql
   -- Copie todo o conteúdo de schema_v6.sql e execute
   ```
3. Aguarde conclusão
4. Rode teste novamente

### Falha: "Coluna ausente"
**Solução:**
1. Verifique em Supabase → SQL Editor:
   ```sql
   -- Verificar vendors.photo_url
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'vendors' AND column_name = 'photo_url';
   
   -- Se não existir, execute:
   ALTER TABLE vendors ADD COLUMN photo_url TEXT;
   ```

### Falha: "fetchVendors() falhou"
**Solução:**
1. Verifique RLS policies em Supabase
2. Certifique-se que a tabela tem `SELECT` habilitado para `anon` (leitura pública)
3. Se precisar de autenticação, faça login primeiro

### Falha: "RLS bloqueia tudo"
**Solução:**
1. Verifique policies em Supabase → Vendors table → Auth Policies
2. Certifique que existe policy:
   - `anon_select_vendors_public` (leitura pública)
   OR
   - `vendor_insere_proprio` (vendor insere seu próprio)
3. Se faltarem, crie no SQL Editor

## 📊 Checklist de Validação Manual

Se preferir testar manualmente:

- [ ] Conectar ao Supabase → Dashboard abre sem erro
- [ ] Tabela users tem registros → SELECT * FROM users LIMIT 1
- [ ] Tabela vendors tem registros → SELECT * FROM vendors LIMIT 1  
- [ ] Coluna photo_url existe → SELECT photo_url FROM vendors LIMIT 1
- [ ] Vendor consegue fazer upload de foto → Testa em VendorProfilePage
- [ ] Foto aparece após reload → Recarrega página, foto ainda está
- [ ] Novo vendor consegue fazer registro → Signup → VendorProfilePage → Upload
- [ ] Gestor consegue criar campanha → CampaignsPage → "Nova Campanha"
- [ ] Campanha aparece na lista → Tela principal mostra campanha criada
- [ ] Vendor consegue fazer oferta → Seleciona campanha → "Fazer Oferta"

## 🎯 Resultado Esperado

### ✅ Sistema Funcionando:
- Todos os 40+ testes passam
- Usuários conseguem se registrar
- Vendors conseguem fazer upload de foto
- Campanhas funcionam ponta-a-ponta
- Ofertas podem ser criadas e aceitas
- Sem erros CSP, RLS ou validação

### ❌ Sistema com Problemas:
- Testes falham em conexão
- Operações retornam nulas
- Imagens não carregam
- Erros de permissão

## 📞 Próximos Passos

1. **Se todos passarem:**
   - ✅ Sistema está pronto para produção
   - ✅ Pode fazer deployment com confiança
   - ✅ Monitore logs em Vercel

2. **Se alguns falharem:**
   - 📋 Anote quais testes falharam
   - 🔧 Aplique solução correspondente
   - 🔄 Rode testes novamente
   - ✅ Continue até todos passarem

## 📝 Log de Testes

Data: _______________
Resultado: _______________
Testes Passando: _______________  
Testes Falhando: _______________  
Ações Tomadas: _______________
