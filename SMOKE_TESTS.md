# 🧪 AgroColetivo - Teste de Smoke (Pré-Produção)

## ✅ Procedimento de Teste Rápido

Execute este teste ANTES de fazer push para produção.

---

## 1️⃣ TESTE DE BUILD

```bash
npm run build
```

**Esperado**:
- ✅ Build completa sem erros
- ✅ `dist/index.html` criado
- ✅ `dist/assets/` tem CSS e JS
- ✅ Tamanho final < 1.5 MB

**Resultado Obtido**:
```
✓ 1367 modules transformed
✓ dist/index.html 1.36 kB
✓ dist/assets/index-yFbEe65Z.css 82.55 kB (gzip: 14.57 kB)
✓ dist/assets/index-XnQxJkxj.js 1,001.56 kB (gzip: 230.91 kB)
✓ built in 15.94s ✅
```

---

## 2️⃣ TESTE DE PREVIEW LOCAL

```bash
npm run preview
```

Abra `http://localhost:4173` no navegador

**Checklist**:
- [ ] Página carrega sem erro 404
- [ ] Logo e imagens aparecem
- [ ] Layout responsivo (teste resize)
- [ ] Formulário é interativo
- [ ] Botões são clicáveis

---

## 3️⃣ TESTE DE LOGIN

1. Clique em **"Acessar Plataforma"** (ou já abra a tela de login)

**Campo de Email**:
- [ ] Digite `teste@exemplo.com`
- [ ] Valida formato email corretamente
- [ ] Mostra feedback visual

**Campo de Senha**:
- [ ] Digite `Senha123!`
- [ ] Mostrar/ocultar senha funciona (ícone olho)
- [ ] Auto-completa corretamente

**Validação**:
- [ ] Email vazio → erro "Informe um email válido"
- [ ] Senha vazia → erro "Informe a senha"
- [ ] Email inválido → erro visual
- [ ] Botão desabilitado com campos vazios

---

## 4️⃣ TESTE DE REGISTRO

1. Clique em **"Criar conta gratuita"**

**Tipo de Conta**:
- [ ] Opção "Fornecedor" selecionável
- [ ] Opção "Gestor" selecionável
- [ ] Seleção visual funciona

**Campos de Registro**:
- [ ] Email campo obrigatório
- [ ] Senha: mostra requisitos? (8+ chars, maiúscula, etc)
- [ ] Confirmação de senha valida matching
- [ ] Empresa: obrigatório para Fornecedor
- [ ] Telefone: mascara corretamente (ex: (11) 99999-9999)

**Validações**:
- [ ] Senha < 6 chars → erro
- [ ] Senhas não coincidem → erro
- [ ] Email já registrado → erro
- [ ] Empresa vazia (vendor) → erro

---

## 5️⃣ TESTE DE ERRO DE LOGIN

1. Tente login com dados errados

**Email: test@test.com, Senha: errado**

**Esperado**:
- [ ] Erro "Email ou senha incorretos"
- [ ] Não mostra qual campo está errado (segurança)
- [ ] Mensagem vermelha clara
- [ ] Campo email limpo

**Rate Limiting**:
- [ ] Tente 5 logins errados consecutivos
- [ ] Na 6ª tentativa: erro "Muitas tentativas"
- [ ] Espera 60 segundos
- [ ] Na 7ª tentativa: funciona novamente

---

## 6️⃣ TESTE DE DATABASE

No console do navegador:
```javascript
// Verificar Supabase conectado
console.log(localStorage.getItem('supabase_auth'))
```

**Esperado**:
- [ ] localStorage tem chave 'supabase_auth'
- [ ] Valor é um JSON válido (quando logado)

---

## 7️⃣ TESTE DE RESPONSIVIDADE

1. Abra DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Teste em:
   - [ ] iPhone 12 (390px)
   - [ ] iPad (768px)
   - [ ] Desktop (1200px)

**Esperado**:
- [ ] Layout não quebra em nenhuma resolução
- [ ] Fonts legíveis
- [ ] Botões clicáveis (> 44px)
- [ ] Scroll funciona

---

## 8️⃣ TESTE DE CONSOLE (F12)

Abra **Console** no DevTools

**Esperado**:
- [ ] Sem erros vermelho 🔴
- [ ] Sem 404 de assets
- [ ] Warnings são normais (Vite, React)
- [ ] Sem URLs sensíveis expostas

---

## 9️⃣ TESTE DE PERFORMANCE

DevTools → **Lighthouse** tab

1. Clique **Analyze page load**

**Métricas Alvo**:
- [ ] Performance: > 70
- [ ] Accessibility: > 80
- [ ] Best Practices: > 80
- [ ] SEO: > 80

---

## 🔟 TESTE DE EMAIL (Se Disponível)

Se você tem acesso ao servidor de email:

1. Fazer registro com email real
2. Aguardar 2-5 segundos
3. Verificar inbox

**Esperado**:
- [ ] Email recebido
- [ ] Assunto: "Código de Verificação"
- [ ] Corpo tem 6-digit code
- [ ] Link de voltar funciona

---

## 📋 CHECKLIST FINAL PRÉ-PRODUÇÃO

- [ ] Build sem erros ✅
- [ ] Preview local funciona ✅
- [ ] Login valida corretamente ✅
- [ ] Registro valida corretamente ✅
- [ ] Erros mostram mensagens claras ✅
- [ ] Rate limiting funciona ✅
- [ ] Database conecta ✅
- [ ] Layout responsivo ✅
- [ ] Console sem erros críticos ✅
- [ ] Performance aceitável ✅

---

## ✨ SE TUDO PASSOU

Parabéns! ✅ Você está pronto para fazer deploy para produção.

**Próximo passo**:

```bash
git push origin main
```

Seu deploy automático vai começar no Render/Vercel.

---

## 🆘 SE ALGO FALHAR

### Erro de Build

```
Error: Cannot find module X
```

**Solução**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Erro no Preview

```
Error: Port 4173 already in use
```

**Solução**:
```bash
npm run preview -- --port 4174
```

### Erro no Login

Verifique `.env`:
```bash
cat .env | grep VITE_SUPABASE
```

Deve ter valores reais (não vazios)

### Erro de Email

Se testes de email falham:
1. Verificar `GMAIL_APP_PASSWORD` está correto
2. Verificar 2-Step Verification está ativado
3. Regenerar Google App Password se necessário

---

**Status**: ✅ TESTES PRONTOS  
**Tempo Estimado**: 5-10 minutos  
**Dificuldade**: Fácil

Boa sorte! 🚀
