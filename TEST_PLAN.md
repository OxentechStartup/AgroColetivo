# 🧪 Plano de Testes Manual - AgroColetivo

## Pré-requisitos
- ✅ Dev server rodando: `npm run dev` (porta 5173+)
- ✅ Supabase configurado no .env
- ✅ Navegador com DevTools aberto (F12)

---

## TESTE 1: Carregar Aplicação
**Status**: ✅ PASSOU

```
1. Ir para http://localhost:5173
2. Verificar se página carrega sem erros
3. Ver LoginPage com opções de "Login" e "Registre-se"
```

**Resultado**: App carrega, Vite dev server funciona

---

## TESTE 2: Fluxo de Registro (SEM EMAIL)

**Dados de Teste**:
```
Email: teste@example.com
Senha: Test123456
Função: Vendedor (VENDOR)
```

**Passos**:
```
1. Clicar em "Registre-se"
2. Preencher email e senha
3. Selecionar "Vendedor" como função
4. Preencher dados adicionais (nome, telefone, cidade)
5. Clicar em "Enviar Cadastro"
6. ⚠️ Vai mostrar 1 de 2 código de verificação (modo DEV)
```

**Resultado Esperado**:
- Mostra código de verificação em vermelho (porque email não foi enviado)
- Salta para página ConfirmEmailPage
- Campo de input para código 6 dígitos

---

## TESTE 3: Verificar Email com Código DEV

**Passos**:
```
1. Copiar código que apareceu em vermelho
2. Colar no input "Código de Verificação"
3. Clicar em "Verificar Email"
4. Aguardar 1.5 segundo
```

**Resultado Esperado**:
- Mensagem: "Email verificado com sucesso! Entrando no sistema..."
- Redireciona para LoginPage automaticamente
- Pronto para fazer login

---

## TESTE 4: Login com Conta Criada

**Passos**:
```
1. Na tela de LoginPage, entrar em "Login"
2. Usar email e senha do Teste 2
3. Clicar em "Entrar"
```

**Resultado Esperado**:
- Loading...
- Dashboard carrega com role VENDOR
- Mostra "Propostas" (página padrão para vendors)
- Sem erros de console

---

## TESTE 5: Verificar Console do Navegador

**DevTools - Console (F12 > Console)**:

Procurar por:
- ✅ Nenhuma mensagem de erro em VERMELHO
- ✅ Mensagens com ✅ indicando sucesso
- ✅ Nenhum "404" ou "cannot find"

**Warnings OK** (amarelos):
- Lucide React deprecation (é normal)
- Vite dev warnings (é normal)

---

## TESTE 6: Testar Responsividade

**Desktop** (1920x1080):
- ✅ Todos elementos alinhados
- ✅ Sem overflow de texto
- ✅ Cores legíveis

**Tablet** (768x1024):
- ✅ Layout se adapta
- ✅ Inputs têm tamanho adequado

**Mobile** (375x667):
- ✅ Font sizes legíveis
- ✅ Botões clicáveis
- ✅ Sem scroll horizontal

---

## TESTE 7: Fluxo Completo End-to-End

1. **Registrar novo usuário**
2. **Confirmar email com código DEV**
3. **Fazer login**
4. **Navegar no dashboard**
5. **Fazer logout**
6. **Verificar nenhum erro**

---

## Checklist Final

- [ ] App carrega sem erros
- [ ] Registro funciona
- [ ] Código de verificação aparece (modo DEV)
- [ ] Email é verificado
- [ ] Login funciona
- [ ] Dashboard abre com dados corretos
- [ ] Console sem erros vermelhos
- [ ] Logout funciona
- [ ] Responsividade OK em mobile
- [ ] Nenhuma importação quebrada

---

## 🐛 Se encontrar erro:

1. **Abra DevTools (F12)**
2. **Vá à aba "Console"**
3. **Copie a mensagem de erro completa**
4. **Envie junto com os passos para reproduzir**

---

## 📝 Comandos Úteis

```bash
# Iniciar dev
npm run dev

# Limpar cache
rm -rf .vite/ dist/

# Build produção (se precisar)
npm run build

# Rodar servidor produção (local)
npm start
```

---

**Importante**: Após cada teste, execute em Console:
```javascript
// Limpar dados de teste
localStorage.clear()
sessionStorage.clear()
```

