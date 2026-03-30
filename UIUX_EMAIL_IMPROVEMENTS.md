# 📋 Guia de Implementação: Melhorias UI/UX e Email

## ✅ O que foi implementado

### 1. 🔐 Segurança & Auditoria de Emails

#### ✅ Migração SQL: `add-email-logs-table.sql`

- Tabela `email_logs` para auditoria completa
- Rastreamento de tentativas e falhas
- Views para análise de estatísticas
- Funções PL/pgSQL para logging automático
- RLS (Row Level Security) para proteção

**Como aplicar:**

```sql
-- 1. Supabase → SQL Editor → New Query
-- 2. Copie TODO o conteúdo de: migrations/add-email-logs-table.sql
-- 3. Clique RUN (Ctrl+Enter)
-- 4. Aguarde ~30 segundos
```

#### ✅ Módulo de Segurança: `src/lib/email-security.js`

Implementa:

- ✅ Rate limiting (3 emails/24h por destinatário)
- ✅ Validação de entrada (email, name, code)
- ✅ CORS restritivo
- ✅ Sanitização de strings
- ✅ Logging automático em banco

#### ✅ Endpoint Melhorado: `api/send-verification-email.js`

Agora com:

- ✅ Validação obrigatória
- ✅ Rate limiting integrado
- ✅ CORS seguro
- ✅ Registro em banco de dados
- ✅ Mensagens de erro descritivas

---

### 2. 📧 Templates de Email Profissionais

#### ✅ Arquivo: `src/lib/email-templates.js`

Inclui templates responsivos para:

1. **Email de Verificação** (`getVerificationEmailTemplate`)
   - Design moderno e mobile-first
   - Suporte a dark mode
   - Código grande e visível
   - Aviso de segurança

2. **Proposta Recebida** (`getNewProposalEmailTemplate`)
   - Para gestores/pivôs
   - Detalhes da proposta em tabela
   - CTA direto para análise

3. **Proposta Aceita** (`getProposalAcceptedEmailTemplate`)
   - Para vendedores
   - Confirmação visual
   - Chamada para ação

**Como usar nos endpoints:**

```javascript
import { getVerificationEmailTemplate } from "../src/lib/email-templates.js";

// Em send-verification-email.js:
const htmlEmail = getVerificationEmailTemplate(cleanName, verificationCode);
```

---

## 🔧 Próximas Etapas (RECOMENDADAS)

### Passo 1: Aplicar Migração SQL

```bash
# 1. Abra Supabase Dashboard
# 2. SQL Editor → New Query
# 3. Cole migrations/add-email-logs-table.sql
# 4. Execute
```

**Verificar sucesso:**

```sql
SELECT * FROM email_logs LIMIT 1;
SELECT * FROM v_email_statistics;
```

### Passo 2: Atualizar `server.mjs` para usar segurança

Edite `server.mjs`:

```javascript
// Adicione imports
import emailSecurity from "./src/lib/email-security.js";
import sendVerificationEmailHandler from "./api/send-verification-email.js";

// Aplique middleware
app.post(
  "/api/send-verification-email",
  emailSecurity.emailSecurityMiddleware,
  emailSecurity.rateLimitMiddleware,
  sendVerificationEmailHandler,
);
```

### Passo 3: Atualizar Templates de Email

Em `api/send-verification-email.js` e `api/send-notification-emails.js`:

```javascript
import {
  getVerificationEmailTemplate,
  getNewProposalEmailTemplate,
} from "../src/lib/email-templates.js";

// Usar novo template
const htmlBody = getVerificationEmailTemplate(name, code);
```

### Passo 4: Criar Endpoint de Dashboard

Criar novo arquivo `api/email-stats.js`:

```javascript
export default async function handler(req, res) {
  // Retorna estatísticas de emails
  // Para mostrar em dashboard do admin
}
```

---

## 🎨 Melhorias de UI Recomendadas (Não Implementadas Ainda)

### 1. Validação em Tempo Real (Formulários)

```javascript
// Em components/forms/EmailInput.jsx
const [error, setError] = useState("");
const handleChange = (e) => {
  const email = e.target.value;
  if (!email.includes("@")) setError("Email inválido");
};
```

### 2. Animações CSS

```css
/* Adicione a Button.module.css */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.button {
  animation: slideIn 0.3s ease-out;
}
```

### 3. Toast de Sucesso/Erro

```javascript
// Melhorar Toast.jsx com ícones e cores
import { CheckCircle, AlertCircle } from "lucide-react";
```

---

## 📊 Monitorar Emails

Depois de aplicar a migração, você pode:

```sql
-- Ver estatísticas de emails
SELECT * FROM v_email_statistics;

-- Encontrar emails que falharam
SELECT * FROM v_failed_emails_to_retry;

-- Contar emails por tipo
SELECT type, COUNT(*) FROM email_logs GROUP BY type;

-- Ver taxa de sucesso por serviço
SELECT service,
  COUNT(*) as total,
  COUNT(CASE WHEN status='sent' THEN 1 END) as success,
  ROUND(COUNT(CASE WHEN status='sent' THEN 1 END)::numeric / COUNT(*) * 100, 2) as percentage
FROM email_logs
GROUP BY service;
```

---

## ⚙️ Variáveis de Ambiente Necessárias

Adicione/confirme em `.env`:

```env
# Email
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=sua-app-password
SENDGRID_API_KEY=sua-api-key

# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# CORS
FRONTEND_URL=https://seu-dominio.com
```

---

## 🧪 Testar Segurança

```bash
# 1. Testar rate limiting
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/send-verification-email \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","name":"Test","code":"123456"}'
  sleep 2
done

# Deve retornar 429 (Too Many Requests) após 3 tentativas em 24h
```

---

## 📝 Checklist de Implementação

- [ ] Aplicar migração SQL
- [ ] Testar tabela `email_logs` em Supabase
- [ ] Atualizar `server.mjs` com middleware de segurança
- [ ] Testar rate limiting
- [ ] Atualizar templates de email
- [ ] Verificar emails nos logs
- [ ] Testar CORS em produção
- [ ] Monitorar estatísticas de email
- [ ] Documentar para o time

---

## 🚨 Possíveis Erros & Soluções

### ❌ "email_logs table does not exist"

**Solução:** Você não executou a migração. Execute `add-email-logs-table.sql`

### ❌ "Rate limit exceeded"

**Solução:** Normal! Espere 24h ou mude o email de teste

### ❌ "CORS error: Origin not allowed"

**Solução:** Adicione seu domínio em `allowedOrigins` no handler

### ❌ "Failed to log email"

**Solução:** Verifique se `SUPABASE_SERVICE_ROLE_KEY` está correto

---

## 📚 Referências

- **Email Security:** RFC 5321 (SMTP), RFC 5322 (Email Format)
- **Rate Limiting:** OpenAI API practices
- **OWASP:** Input validation, CORS, Rate limiting
- **Email Best Practices:** Litmus, Email on Acid

---

**Última atualização:** 27 de Março 2026
**Status:** ✅ Implementação 70% concluída
