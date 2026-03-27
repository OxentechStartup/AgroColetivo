# ⚠️ IMPORTANT: Start Email Server Before Testing

## The Issue
You're getting **500 Internal Server Error** because the email server on port 3001 is **NOT RUNNING**.

The Vite proxy is trying to forward requests to `http://localhost:3001`, but nothing is listening there.

## Solution: Start Email Server

### Option 1: Quick Start (Recommended - Windows)
```bash
.\start-dev.bat
```
This opens 2 new terminal windows:
- Terminal 1: Vite dev server (frontend)
- Terminal 2: Email server (API)

### Option 2: Quick Start (macOS/Linux)
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Option 3: Manual (Any OS)

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run email-server
```

## Expected Output

### Terminal 1 (Vite):
```
  VITE v5.4.21  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Terminal 2 (Email Server):
```
✅ Servidor rodando em http://0.0.0.0:3001
```

**Both messages must appear before testing!**

## Test Registration Again

1. Wait for both servers to be ready
2. Go to: http://localhost:5173
3. Register: test@example.com, password, company, role
4. Should see: "Verificar email" page (no more 500 error!)
5. Check inbox for verification code

## Verify It's Working

### Check Vite Proxy
Open browser DevTools (F12) and go to Network tab:
- Register user
- Look for: `POST /api/send-verification-email`
- Should show: **200 OK** (not 500)

### Check Email Server Logs
Terminal 2 should show:
```
📧 Tentando enviar código de verificação para test@example.com
✅ Email enviado via Gmail para test@example.com
```

## Still Getting 500?

### 1. Check Email Server is Running
```bash
netstat -ano | findstr :3001    # Windows
lsof -i :3001                   # macOS/Linux
```

Should show a node.js process listening.

### 2. Check Gmail Credentials
In `.env`:
```
GMAIL_USER=oxentech.startup@gmail.com
GMAIL_APP_PASSWORD=dlskwqszofvtdfsz
```

If wrong, email server returns 500.

### 3. Check Email Server Console
Terminal 2 should show error details:
```
❌ ERRO FATAL: Gmail auth failed
```

Fix credentials and restart email server.

### 4. Kill Port 3001 and Restart
```bash
# Windows
taskkill /F /IM node.exe

# macOS/Linux
pkill -f "node email-server"

# Then restart
npm run email-server
```

## Next Steps

✅ **Once both servers are running and registration works:**
1. Apply schema to Supabase (see: APPLY_SCHEMA_GUIDE.md)
2. Test full registration → email verification → login flow
3. Then I'll audit business logic and prepare for production

---

**Need help? Check DEVELOPMENT_SETUP.md for more details.**
