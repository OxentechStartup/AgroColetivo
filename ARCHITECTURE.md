# AgroColetivo - Arquitetura Separada

Este projeto foi dividido em **Frontend** e **Backend** separados para melhor organização, escalabilidade e deployment independente.

## 📂 Estrutura

```
AgroColetivo-Backend/      # Node.js + Express API
├── api/                   # Endpoints de email, notificações
├── server.mjs             # Express server
├── email-server.cjs       # Dev email server
├── .env                   # Environment variables
├── render.yaml            # Render deployment config
└── package.json           # Backend dependencies

AgroColetivo-Frontend/     # React + Vite
├── src/                   # React components
├── index.html
├── vite.config.js
├── render.yaml            # Render deployment config
└── package.json           # Frontend dependencies
```

## 🚀 Desenvolvimento Local

### Backend

```bash
cd AgroColetivo-Backend
npm install
npm start
# Roda em http://localhost:3000
```

### Frontend

```bash
cd AgroColetivo-Frontend
npm install
npm run dev
# Roda em http://localhost:5173
# Proxy /api → http://localhost:3000
```

## 🌐 Produção (Render)

### Backend
- **Service Name:** `agrocoletivo-backend`
- **URL:** `https://agrocoletivo-backend.onrender.com`
- **Environment Variables:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `GMAIL_USER`
  - `GMAIL_APP_PASSWORD`
  - `SENDGRID_API_KEY` (opcional)

### Frontend
- **Service Name:** `agrocoletivo-frontend`
- **URL:** `https://agrocoletivo-frontend.onrender.com`
- **Environment Variables:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_URL` = `https://agrocoletivo-backend.onrender.com`

## 📝 Configuração

### Backend (.env)

```
NODE_ENV=production
PORT=3000
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
GMAIL_USER=...
GMAIL_APP_PASSWORD=...
```

### Frontend (vite.config.js)

O frontend detecta automaticamente a URL da API:
- **Dev:** `http://localhost:3000` (via proxy Vite)
- **Prod:** Variável `VITE_API_URL` (configurada em Render)

## 🔗 Comunicação

Frontend → Backend via URLs relativas `/api/*`

Exemplos de endpoints:
- `POST /api/send-verification-email`
- `POST /api/send-login-alert-email`
- `POST /api/send-password-recovery-email`

## ✅ Deploy Render

1. **Backend:**
   ```
   git clone https://github.com/OxentechStartup/AgroColetivo-Backend.git
   ```
   - Connect to Render
   - Render detecta `render.yaml`
   - Configure environment variables
   - Deploy automático no git push

2. **Frontend:**
   ```
   git clone https://github.com/OxentechStartup/AgroColetivo-Frontend.git
   ```
   - Connect to Render
   - Render detecta `render.yaml`
   - Configure `VITE_API_URL` apontando para backend
   - Deploy automático no git push

## 📚 Documentação

Veja:
- `/docs/DEVELOPMENT.md` - Setup local detalhado
- `/docs/DEPLOYMENT.md` - Deploy em produção
