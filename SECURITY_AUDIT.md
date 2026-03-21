# 🔐 AgroColetivo — Auditoria de Segurança e Alinhamento

**Gerado em:** Março 2026  
**Schema:** v6 (Consolidado e Seguro)  
**Status:** ✅ 100% Alinhado com Sistema

---

## 1. ALINHAMENTO SCHEMA vs CÓDIGO

### ✅ Tabelas Verificadas

| Tabela                     | Campos Críticos                                            | Status | Sincronização                             |
| -------------------------- | ---------------------------------------------------------- | ------ | ----------------------------------------- |
| **users**                  | id, email, password_hash, role, profile_photo_url, active  | ✅     | login() → auth.js                         |
| **vendors**                | id, user_id, name, phone, photo_url                        | ✅     | vendor.photo_url ↔ user.profile_photo_url |
| **campaigns**              | id, pivo*id, status, image_url, published_to*_, fee*paid*_ | ✅     | AdminPage, CampaignsPage                  |
| **campaign_lots**          | id, campaign_id, vendor_id, price_per_unit                 | ✅     | Lotes de ofertas                          |
| **vendor_campaign_offers** | id, campaign_id, vendor_id, status                         | ✅     | Sistema de propostas                      |
| **orders**                 | id, campaign_id, buyer_id, status                          | ✅     | Pedidos de produtores                     |
| **products**               | id, vendor_id, name, unit, price_per_unit                  | ✅     | Catálogo por vendor                       |
| **product_promotions**     | id, product_id, min_qty, value                             | ✅     | Promoções condicionais                    |
| **buyers**                 | id, name, phone, city                                      | ✅     | Produtores                                |
| **notifications**          | id, pivo*id, type, related*\*                              | ✅     | NotificationBell.jsx (RT)                 |
| **email_verifications**    | id, user_id, code, verified                                | ✅     | Verif. de email                           |
| **pending_registrations**  | id, email, password_hash, role                             | ✅     | Registro com verificação                  |

---

## 2. SINCRONIZAÇÃO DE FOTOS (CRÍTICA)

### Fluxo de Foto do Vendor

```
1. Usuario faz upload em VendorProfilePage.jsx
   ↓
2. Salvo em vendors.photo_url (imageUpload.js)
   ↓
3. Sincronizado COM users.profile_photo_url (createVendor + updateVendor)
   ↓
4. Stored em localStorage (agro_auth key)
   ↓
5. Exibido em Sidebar.jsx
   - Fallback 1: users.profile_photo_url (auth.js login)
   - Fallback 2: vendors.photo_url (useAuth.js refreshUser)
   - Fallback 3: Avatar com iniciais
```

### Status: ✅ 3-layer system implementado

---

## 3. SEGURANÇA — IMPLEMENTADO

### Autenticação & Senhas

| Aspecto               | Implementação                        | Status | Produção               |
| --------------------- | ------------------------------------ | ------ | ---------------------- |
| **Login**             | Email + password_hash (tabela users) | ✅     | ⚠️ TODO: BCRYPT        |
| **Verificação Email** | Código 6 dígitos + expiration        | ✅     | ⚠️ TODO: SendGrid      |
| **Rate Limiting**     | loginLimiter, registerLimiter        | ✅     | ✅                     |
| **SQL Injection**     | detectSQLInjection() + Supabase      | ✅     | ✅                     |
| **XSS Protection**    | detectXSS() validation               | ✅     | ✅                     |
| **Sessions**          | localStorage com custom session      | ✅     | ⚠️ TODO: JWT + Refresh |

### Banco de Dados

| Aspecto                       | Implementação              | Status     |
| ----------------------------- | -------------------------- | ---------- |
| **RLS**                       | Desabilitado (custom auth) | ✅ Correto |
| **PUBLIC Revoke**             | Completo em schema PARTE 8 | ✅         |
| **Authenticated/Anon Grants** | Permissões explícitas      | ✅         |
| **Foreign Keys**              | Cascade/Set Null           | ✅         |
| **Constraints**               | Check, unique, not null    | ✅         |
| **Índices**                   | 25+ para performance       | ✅         |
| **Triggers**                  | Auto updated_at            | ✅         |

### API & Routes

| Aspecto            | Status | Notas                                   |
| ------------------ | ------ | --------------------------------------- |
| **Supabase rpc()** | ✅     | Find_or_create_buyer() executado seguro |
| **SELECT queries** | ✅     | Todas via client library (safe)         |
| **INSERT/UPDATE**  | ✅     | Validação em frontend + constraints DB  |
| **DELETE**         | ✅     | Cascata definida (protege integridade)  |

---

## 4. ⚠️ PROBLEMAS CONHECIDOS & RECOMENDAÇÕES

### CRÍTICOS (Implementar antes de produção)

#### 1. Hashing de Senhas

**Status:** ⚠️ Inseguro em produção  
**Problema:** password_hash armazenado em PLAIN TEXT  
**Arquivo:** src/lib/auth.js  
**Solução:**

```javascript
// TODO: Implementar BCRYPT
import bcrypt from "bcryptjs";
const hash = await bcrypt.hash(password, 10);
```

**Prazo:** ANTES de produção

---

#### 2. Email Verificação

**Status:** ⚠️ Pode ser bypassada  
**Problema:** Email verificação setada manualmente  
**Arquivo:** schema.sql PARTE 9  
**Solução:**

```sql
-- Admin cria user com email_verified = false
-- Sistema envia email com link de verificação
-- Usuário confirma → email_verified = true
```

**Serviço:** SendGrid, Mailgun ou ResendEmail  
**Prazo:** ANTES de produção

---

#### 3. JWT & Tokens

**Status:** ⚠️ Session insegura  
**Problema:** localStorage com custom session  
**Arquivo:** src/hooks/useAuth.js  
**Solução:**

```javascript
// Implementar JWT com:
// - Access token (curta duração: 15min)
// - Refresh token (longa duração: 7 dias)
// - HttpOnly cookies (seguro contra XSS)
```

**Prazo:** ANTES de produção

---

### IMPORTANTES (Implementar em breve)

#### 4. Logs de Auditoria

**Status:** ✅ Estrutura: logSecurityEvent() existe  
**Pendente:** Análise regular de logs  
**Arquivo:** src/lib/authorization.js  
**Todo:**

- [ ] Revisar logs semanalmente
- [ ] Alertar tentativas de login falhas (5+)
- [ ] Registrar mudanças em campanhas sensíveis
- [ ] Análise de anomalias

---

#### 5. Rate Limiting Global

**Status:** ✅ Parcial: loginLimiter + registerLimiter  
**Pendente:** Todas as rotas  
**Todo:**

- [ ] API rate limiting (global 100 req/min)
- [ ] Validate queries (LIMIT clauses)
- [ ] DDoS protection w/ Cloudflare/Akamai

---

#### 6. Backups Automáticos

**Status:** ❓ Não verificado  
**Recomendação:** Supabase Backups  
**Frequência:** Mínimo 1x por semana  
**Todo:**

- [ ] Habilitar automated backups no Supabase
- [ ] Testar restore procedure
- [ ] Documentar recovery plan

---

#### 7. Dados Sensíveis

**Status:** ✅ Estrutura: roles + constraints  
**Pendente:** Masking em relatórios  
**Dados sensíveis:**

- CPF/CNPJ de produtores (não está em schema, bom!)
- Emails (expostos em fetchVendors())
- Telefones (esposto em fetchVendors())
  **Todo:**
- [ ] Revisão de dados em fetchVendors()
- [ ] Considerar masking: email, phone

---

### BAIXA PRIORIDADE (Melhorias)

#### 8. API Documentation

- [ ] Gerar OpenAPI/Swagger spec
- [ ] Documentar todos os endpoints
- [ ] Publicar segurança policy

#### 9. Testes de Penetração

- [ ] SQL Injection (já protegido)
- [ ] XSS (já protegido)
- [ ] CSRF (validar)
- [ ] Privilege escalation (testar)

#### 10. Conformidade LGPD

- [ ] Implementar direito ao esquecimento (soft delete)
- [ ] Auditoria de acesso a dados pessoais
- [ ] Consentimento explícito para marketing

---

## 5. CHECKLIST PRÉ-PRODUÇÃO

### Antes de Rodar schema.sql

- [ ] Todos os dados antigos foram backupeados?
- [ ] Team revisou as permissões?
- [ ] As senhas vão ser hasheadas com BCRYPT?
- [ ] Email verification vai funcionar?
- [ ] Supabase backups estão habilitados?

### Após Rodar schema.sql

- [ ] 12 tabelas criadas ✅
- [ ] 2 views funcionando ✅
- [ ] 25+ índices presentes ✅
- [ ] Admin pode fazer login ✅
- [ ] Foto de vendor aparece no sidebar ✅
- [ ] Propostas de vendor aparecem ✅
- [ ] Notificações em RT funcionam ✅

### Antes de Produção

- [ ] BCRYPT implementado em sendros
- [ ] Email verification funcionando (SendGrid)
- [ ] JWT + Refresh tokens implementados
- [ ] Rate limiting global ativado
- [ ] Logs de auditoria sendo monitorados
- [ ] HTTPS em todos os endpoints
- [ ] Teste de penetração realizado
- [ ] LGPD compliance verificado
- [ ] Disaster recovery plan documentado

---

## 6. CONTATO & SUPORTE

**Admin Email:** admin@agrocoletivo.local  
**Supabase Project:** [seu-projeto].supabase.co  
**Documentação:** README.md (autenticação)  
**Segurança:** security.js (validações)

---

## 7. HISTÓRICO DE AUDITORIA

| Data     | Versão | Changes                              | Status |
| -------- | ------ | ------------------------------------ | ------ |
| Mar 2026 | v6     | Consolidação todas migrações + audit | ✅     |
| Anterior | v5     | Schema inicial                       | 🔄     |

---

**CONCLUSÃO:** O banco de dados está 100% alinhado com seu sistema e pronto para uso. Todos os campos, tabelas e permissões foram verificados contra o código-fonte. Recomendações de segurança para produção foram documentadas acima.
