# 📋 Guia: Configurar Environment Variables na Render

## Passo 1: Preparar arquivo .env local

1. Copie `.env.example` para `.env.local` ou `.env`:
   ```bash
   cp .env.example .env.local
   ```

2. Preencha com seus valores reais:
   - **VITE_SUPABASE_URL**: Da sua conta Supabase
   - **VITE_SUPABASE_ANON_KEY**: Da sua conta Supabase
   - **GMAIL_USER**: Seu email Gmail
   - **GMAIL_APP_PASSWORD**: Google App Password (16 caracteres)

## Passo 2: Configurar na Render Dashboard

### Opção A: Importar via UI (Recomendado)
1. Acesse: https://dashboard.render.com
2. Selecione o serviço **"agrocoletivo"**
3. Vá para aba **"Environment"**
4. Procure por botão **"Import"** ou similar
5. Carregue seu arquivo `.env.local`
6. Clique **"Save"**

### Opção B: Adicionar Manualmente (Se não tiver opção de import)
1. Acesse: https://dashboard.render.com
2. Selecione o serviço **"agrocoletivo"**
3. Vá para aba **"Environment"**
4. Clique **"Add Environment Variable"** para cada linha:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `VITE_SUPABASE_URL` | (seu URL) |
| `VITE_SUPABASE_ANON_KEY` | (sua key) |
| `GMAIL_USER` | (seu email) |
| `GMAIL_APP_PASSWORD` | (16 caracteres) |

5. Clique **"Save"**

## Passo 3: Verificar se funcionou

Após salvar, Render faz rebuild automático. Aguarde ~2-3 minutos.

Depois acesse:
```
https://agrocoletivo.onrender.com/api/debug
```

Procure pela seção `email`. Deve mostrar:
```json
"email": {
  "hasGmailUser": true,
  "gmailUserValue": "oxen***",
  "hasGmailPassword": true,
  "gmailPasswordLength": 16,
  "hasSendgridKey": false,
  "sendgridKeyLength": 0
}
```

Se tudo estiver `true`, **emails já estão funcionando!** 🎉

## Passo 4: Testar envio de email

Acesse a Render em:
```
https://agrocoletivo.onrender.com
```

Tente fazer signup com um email e veja se chega o código de verificação.

Pronto! ✅

---

## ⚠️ Importante

- **NUNCA** faça commit de `.env` (com valores reais) no Git
- O `.env.example` é apenas para referência
- Cada ambiente (localhost, Render) tem seus próprios valores
- Se mudar as credenciais, atualize também na Render
