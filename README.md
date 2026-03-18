# 🌾 AgroColetivo — Plataforma de Compras Coletivas

Sistema web para consolidação de demanda, ofertas e transações agrícolas com gestão de campanhas e lotes.

## 🚀 Quickstart

```bash
npm install
npm run dev  # Abre em http://localhost:5173
```

## 📋 Configuração

### 1. Variáveis de Ambiente (.env)

```
VITE_SUPABASE_URL=https://iepgeibcwthilohdlfse.supabase.co
VITE_SUPABASE_ANON_KEY=seu_chave_aqui
```

### 2. Setup do Banco de Dados

Execute `schema.sql` no Supabase SQL Editor → Pronto!

### 3. Dados de Teste Padrão

Após executar schema.sql, você tem 4 usuários para testar:

| Email                        | Senha        | Rol         |
| ---------------------------- | ------------ | ----------- |
| `admin@agrocoletivo.local`   | `admin@123`  | Admin       |
| `gestor@agrocoletivo.local`  | `gestor@123` | Gestor/Pivô |
| `vendor1@agrocoletivo.local` | `vendor@123` | Fornecedor  |
| `vendor2@agrocoletivo.local` | `vendor@123` | Fornecedor  |

**Ou registre contas novas** via "Criar Conta" no app! ✅

## 🔐 Autenticação

- **Método**: Email + Senha (autenticação manual na tabela `users`)
- **Roles**: `admin` | `gestor` (pivô) | `vendor` (fornecedor)
- **RLS**: Desabilitado em `users` (controle via application logic)
- **Email Verificação**: ✅ Auto-verificado para demo (em produção: SendGrid/Mailgun)
- **Imagens**: Base64 Data URI em `profile_photo_url` (users) e `photo_url` (vendors)

⚠️ **IMPORTANTE**:

- Para PRODUÇÃO, implementar hash bcrypt em `password_hash`
- Para PRODUÇÃO, enviar email de verificação via SendGrid/Mailgun/Resend
- Use `oxentech.software@gmail.com` para envios reais

## 📁 Estrutura

```
src/
├── components/     # Componentes React reutilizáveis
├── pages/         # Páginas (Login, Dashboard, Perfil, etc)
├── lib/           # auth.js, campaigns.js, vendors.js, etc
├── hooks/         # useAuth, useCampaigns, etc
├── utils/         # security.js, validators, etc
└── styles/        # global.css
```

## 📊 Tabelas Principais

| Tabela      | Descrição                            |
| ----------- | ------------------------------------ |
| `users`     | Gestores/admins (email, senha, foto) |
| `vendors`   | Fornecedores (vinculado a user.id)   |
| `campaigns` | Campanhas de compra coletiva         |
| `products`  | Produtos por vendor                  |
| `orders`    | Pedidos dos compradores              |

## 🛠️ Desenvolvimento

```bash
npm run dev      # Servidor local :5173
npm run build    # Build production (620KB gzip)
npm run preview  # Preview do build
```

## ✅ Features

- ✅ Login/Registro com email + senha
- ✅ Upload de fotos (5MB max, JPG/PNG/WebP)
- ✅ Dashboard com campanhas
- ✅ Gestão de ofertas e lotes
- ✅ Pedidos com status
- ✅ Perfis de usuário

## 🐛 Troubleshooting

**"Erro 500" ao registrar?**
→ Verifique variáveis `.env` e execute `schema.sql`

**"Email ou senha incorretos" ao logar?**
→ Use emails dos dados de teste acima ou registre uma conta nova

**Foto não aparece no perfil?**
→ Máximo 5 MB, formatos: JPG, PNG ou WebP

**Build não compila?**
→ Rodar `npm install` novamente

---

**Última atualização**: Março 2026 | **Status**: ✅ Pronto para desenvolvimento
