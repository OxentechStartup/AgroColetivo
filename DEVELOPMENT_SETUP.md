# 🚀 AgroColetivo Development Setup

## Overview
The AgroColetivo development environment requires **TWO servers running in parallel**:
1. **Vite Dev Server** (port 5173) - React frontend
2. **Email Server** (port 3001) - Email verification endpoint

Both must run together for the full development experience.

## Quick Start (2 Terminals)

### Terminal 1: Start Vite Dev Server
```bash
npm run dev
```
- Opens: http://localhost:5173
- Hot reload enabled
- Watches for changes

### Terminal 2: Start Email Server
```bash
node email-server.cjs
```
- Listens on: http://localhost:3001
- Provides: `/api/send-verification-email` endpoint
- Sends emails via Gmail SMTP (from `.env` config)

**Wait for both servers to show "ready" messages before testing!**

---

## How It Works

### Frontend (Vite) → Backend (Express)
1. User submits registration form (http://localhost:5173)
2. Frontend calls `/api/send-verification-email`
3. **Problem:** Vite dev server doesn't know about `/api/` routes
4. **Solution:** Vite proxies unknown routes to parent origin

### Email Flow
1. Frontend submits: `POST /api/send-verification-email` with `{email, name, code}`
2. Express server (port 3001) receives the request
3. Gmail SMTP sends verification email
4. Response: `{success: true, messageId: "..."}`

---

## Troubleshooting

### ❌ "404: Servidor retornou 404"
**Cause:** Email server not running

**Solution:**
```bash
# Terminal 2 - Start email server
node email-server.cjs
```
Should output: `✅ Servidor rodando em http://0.0.0.0:3001`

### ❌ "Email Failed to Send"
**Cause:** Gmail credentials invalid or Gmail SMTP not configured

**Fix:**
1. Check `.env` file has correct credentials:
   - `GMAIL_USER=oxentech.startup@gmail.com`
   - `GMAIL_APP_PASSWORD=dlskwqszofvtdfsz`
2. Ensure Gmail account has 2FA enabled
3. Generate new App Password: https://myaccount.google.com/apppasswords

### ❌ "Port 3001 Already in Use"
**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Or kill it directly (Windows)
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Then restart email server
node email-server.cjs
```

### ❌ "CORS Error"
**Cause:** Email server CORS not configured for your origin

**Fix:** Email server has CORS enabled by default
- Add your origin to `email-server.cjs` line 18 if needed

---

## Testing Registration Flow

### 1. Start Both Servers
```bash
# Terminal 1
npm run dev

# Terminal 2  
node email-server.cjs
```

### 2. Register New User
- Go to: http://localhost:5173
- Click: "Registrar"
- Email: `test@example.com`
- Password: `Test@1234`
- Company: `Test Company`
- Role: Select one
- Click: "Registrar"

### 3. Check Results
- **Success:** See "Verificar email" page
- **Check email:** Verification code sent to inbox
- Or check browser console for dev code (fallback)

### 4. Verify Email
- Enter verification code
- Click: "Verificar Email"
- Should redirect to login page
- Can now login!

---

## Development Commands

```bash
# Start frontend only (Vite)
npm run dev

# Start email server only
node email-server.cjs

# Build for production
npm run build

# Start production server (requires build first)
node server.mjs

# Run email verification test
node test-email-verification.mjs

# Run email server test
node test-email.js
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Browser (http://localhost:5173)            │
│  ┌─────────────────────────────────────────┤
│  │  React App                              │
│  │  ├─ LoginPage                           │
│  │  ├─ RegisterForm                        │
│  │  └─ ConfirmEmailPage                    │
│  └─────────────────────────────────────────┤
│         ↓ POST /api/send-verification-email
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Express Email Server (port 3001)           │
│  ┌─────────────────────────────────────────┤
│  │  POST /api/send-verification-email      │
│  │  ├─ Validate input                      │
│  │  ├─ Send via Gmail SMTP                 │
│  │  └─ Return success/error                │
│  └─────────────────────────────────────────┤
│         ↓ SMTP                             │
└─────────────────────────────────────────────┘
                    ↓
         Gmail Server (smtp.gmail.com)
                    ↓
            User's Email Inbox
```

---

## Files Reference

- **Frontend:** `src/lib/email-client.js` - Calls `/api/send-verification-email`
- **Backend:** `email-server.cjs` - Handles email sending
- **API Handler:** `api/send-verification-email.js` - Production endpoint
- **Config:** `.env` - Gmail credentials

---

## What's Next

After registration works:
1. Test email verification flow
2. Test vendor profile creation
3. Test campaign creation
4. Test order placement
5. Deploy to production

See: `PRODUCTION_READY.md` for deployment checklist

---

✅ **Happy developing!**
