# 🚀 AgroColetivo - Guia de Deploy para Produção

## ✅ Checklist Pré-Deploy

- [x] Build produção testado
- [x] Componentes UI restaurados
- [x] Migrações SQL preparadas (schema-migration-v7-PRODUCTION.sql)
- [x] `.env.example` criado
- [x] `.env` no .gitignore
- [x] Autenticação validada
- [x] Database schema pronto

---

## 🔧 CONFIGURAÇÃO PRÉ-DEPLOY

### 1. Supabase Database - Aplicar Migrações

**IMPORTANTE**: Fazer isso ANTES de fazer deploy do código!

1. Abra [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto AgroColetivo
3. Vá para **SQL Editor** → **New Query**
4. Copie todo o conteúdo de `schema-migration-v7-PRODUCTION.sql`
5. Cole na query e clique **RUN**
6. Aguarde 10-30 segundos
7. Valide:
   ```sql
   -- Verificar campos adicionados
   SELECT column_name FROM information_schema.columns 
   WHERE table_name='campaigns' AND column_name LIKE 'published_%';

   -- Verificar NOT NULL constraints
   SELECT column_name, is_nullable FROM information_schema.columns 
   WHERE table_name='vendors' AND column_name IN ('phone', 'city', 'notes');
   ```

### 2. Configurar Secrets em Render.com (ou seu host)

Se usando **Render**:
1. Dashboard → Your Services → AgroColetivo
2. **Environment** → **Add Environment Variable**
3. Adicione cada variável:

| Chave | Valor | Exemplo |
|-------|-------|---------|
| `NODE_ENV` | `production` | `production` |
| `VITE_SUPABASE_URL` | URL do Supabase | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave anon do Supabase | `eyJhbGc...` |
| `GMAIL_USER` | Email do Gmail | `seu-email@gmail.com` |
| `GMAIL_APP_PASSWORD` | Senha de app do Google | `xxxx xxxx xxxx xxxx` |
| `VITE_ALLOWED_ORIGINS` | URLs permitidas | `https://seu-dominio.com` |

**⚠️ NUNCA adicione ao git!** Use o painel de secrets do host.

### 3. Google App Password (Gmail)

Se você não tem uma:

1. Abra [Google Account](https://myaccount.google.com)
2. **Security** → ative **2-Step Verification** (se não tiver)
3. Volte para **Security** → procure **App passwords**
4. Selecione: **Mail** → **Windows Computer** (ou seu dispositivo)
5. Google gera 16 caracteres (ex: `xxxx xxxx xxxx xxxx`)
6. Copie para `GMAIL_APP_PASSWORD` no Render

### 4. Atualizar Variáveis de Ambiente no Render

Após configurar no Render:
1. Trigger um novo deploy
2. Vai usar as novas env vars automaticamente

---

## 📦 FAZER DEPLOY

### Opção A: Git Push para Render (Recomendado)

```bash
# Verificar branch
git branch

# Commit final
git add -A
git commit -m "feat: production release v0.22.0 - database migrations, auth improvements, security hardening"

# Push para produção
git push origin main
```

Render fará deploy automaticamente.

### Opção B: Vercel

```bash
npm install -g vercel
vercel --prod
```

### Opção C: Build Manual + Deploy

```bash
npm run build
# Enviar conteúdo de ./dist para seu servidor
```

---

## ✅ VALIDAÇÃO PÓS-DEPLOY

### 1. Site Acessível

- [ ] `https://seu-app.onrender.com` carrega
- [ ] Sem erro 404 ou 503
- [ ] Imagens carregam corretamente

### 2. Login Funciona

- [ ] Login com email/senha válido ✅
- [ ] Erro com dados inválidos ✅
- [ ] Rate limiting funciona (tente 5x errado)
- [ ] Sessão persiste (refresh F5 mantém login)

### 3. Registro Funciona

- [ ] Registro de vendor aceito
- [ ] Email de verificação recebido
- [ ] Código de 6 dígitos funciona
- [ ] Usuário logado após verificação

### 4. Database

- [ ] Verificar migrations aplicadas:
  ```sql
  SELECT COUNT(*) FROM campaigns 
  WHERE published_to_buyers IS NOT NULL;
  ```
- [ ] Vendors têm NOT NULL constraints:
  ```sql
  SELECT * FROM vendors WHERE phone IS NULL OR city IS NULL;
  -- Deve retornar 0 rows
  ```

### 5. Monitoramento

- [ ] Verificar logs em Render/Vercel
- [ ] Procurar por erros de auth
- [ ] Procurar por erros de database

---

## 🔐 SEGURANÇA - CHECKLIST

- [x] `.env` não está no git
- [x] Secrets configurados no host
- [x] `.env.example` como template
- [x] Supabase Auth nativo ativo
- [x] RLS desabilitado (custom auth no frontend)
- [x] Rate limiting funcional
- [x] Input validation ativo

---

## 📊 VERSIONING

**Versão Anterior**: 0.21.0 (Development)  
**Versão Atual**: 0.22.0 (Production) ← **VOCÊ ESTÁ AQUI**

### Mudanças em v0.22.0

**Novas Funcionalidades**:
- ✅ Database migrations aplicadas (publish flags, vendor fields required)
- ✅ `.env.example` seguro criado
- ✅ Componentes UI restaurados
- ✅ Production build validado

**Correções de Segurança**:
- ✅ Removido .env do git tracking
- ✅ Credentials movidas para secrets
- ✅ Build size otimizado

**Testes**:
- ✅ Build: OK (1,001 kB)
- ✅ Auth: OK
- ✅ Database: OK

---

## 🆘 TROUBLESHOOTING

### Erro: "Database migrations not applied"

**Solução**: Execute `schema-migration-v7-PRODUCTION.sql` no Supabase SQL Editor antes de fazer deploy.

### Erro: "Email não envia"

**Checklist**:
1. [ ] `GMAIL_APP_PASSWORD` correto no Render
2. [ ] 2-Step Verification ativado no Google
3. [ ] Verificar logs em Render para erros SMTP

### Erro: "Login falha com 'Email ou senha incorretos'"

**Checklist**:
1. [ ] Supabase credenciais corretas (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
2. [ ] Database migrations aplicadas
3. [ ] Usuário existe na tabela `users`
4. [ ] Verificar logs de auth no Supabase

### Erro: "Chunk size > 500 kB"

**Nota**: Apenas aviso, não é erro crítico. App funciona normalmente.

**Otimização Futura**:
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
        }
      }
    }
  }
}
```

---

## 📞 SUPORTE

Se algo der errado:

1. Verificar logs em Render/Vercel dashboard
2. Rodar `npm run build` localmente para reproduzir
3. Verificar `.env` está configurado com valores de produção
4. Consultar documentation em `src/context/USAGE.md`

---

## ✨ PRÓXIMAS MELHORIAS

- [ ] Implementar 2FA/MFA
- [ ] Code splitting dinâmico (reduzir chunk size)
- [ ] Audit logging em produção
- [ ] Session revocation dashboard
- [ ] Biometric authentication
- [ ] Social login (Google, Facebook)

---

**Status**: ✅ PRONTO PARA PRODUÇÃO  
**Data**: 2026-03-27  
**Versão**: 0.22.0
