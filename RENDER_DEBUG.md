# 🚨 Diagnóstico Render 503

## O que fazer para descobrir o problema:

### 1️⃣ Acessar Logs do Render

```
1. Ir para https://dashboard.render.com/
2. Selecionar serviço "agrocoletivo"
3. Ir na aba "Logs"
4. Procurar por erro exato
```

### 2️⃣ Possíveis Causas e Soluções

#### ❌ Memória Insuficiente

**Sintoma:** Build começa mas não termina, depois 503
**Solução:** Upgrade para plano pago ou otimizar bundle

#### ❌ Build Falha

**Sintoma:** "Build failed" nos logs
**Solução:**

```bash
# Local, rodar:
npm run build
npm start
```

#### ❌ Env Vars Faltando

**Sintoma:** "GMAIL_USER is undefined" nos logs
**Solução:** Verificar todas as variáveis estão sincronizadas em Render

### 3️⃣ Verificar Variáveis Necessárias

No Render dashboard, verificar se existem:

- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `GMAIL_USER`
- ✅ `GMAIL_APP_PASSWORD`

### 4️⃣ Solução Rápida Para Testar

**Adicione isto ao `server.mjs` para debug:**

```javascript
// No início do arquivo
console.log("🔍 DEBUG - Variáveis carregadas:");
console.log("  GMAIL_USER:", process.env.GMAIL_USER ? "✅" : "❌");
console.log(
  "  GMAIL_APP_PASSWORD:",
  process.env.GMAIL_APP_PASSWORD ? "✅" : "❌",
);
console.log("  NODE_ENV:", process.env.NODE_ENV);
console.log("  PORT:", process.env.PORT);
```

### 5️⃣ Se Continuar Falhando

**Fazer redeploy limpo no Render:**

1. Ir em Settings
2. Clicar em "Clear build cache"
3. Clicar em "Manual Deploy"
4. Escolher "Deploy latest commit"
5. Esperar ~2-3 minutos
6. Verificar logs

### 6️⃣ Upgrade Alternativo

Se estiver free tier, considerar upgrade para "Starter" ($7/mês):

- 2 vCPU
- 4GB de RAM
- Muito mais confiável para Node + email

---

## Informações do Projeto

- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Tamanho Bundle:** ~1MB (com gzip ~230KB)
- **Dependências:** Express, Nodemailer, Supabase, React
- **Portas:** 3000 (produção), 3001 (email-server)

---

## ⚡ Quick Debug Checklist

- [ ] Logs do Render mostram erro específico?
- [ ] Variáveis de ambiente todas setadas?
- [ ] Build local (`npm run build`) funciona?
- [ ] Server local (`npm start`) inicia sem erro?
- [ ] Tentou "Clear build cache" no Render?
- [ ] Tentou manual "Deploy latest commit"?
