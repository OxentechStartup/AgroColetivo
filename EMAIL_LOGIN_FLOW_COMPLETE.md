# 📧 FLUXO COMPLETO DE EMAIL NO LOGIN/REGISTRO - AgroColetivo

## 📋 SUMÁRIO EXECUTIVO

O sistema AgroColetivo possui 4 tipos de email durante autenticação:

| Email                 | Quando?                 | Código             | Status              |
| --------------------- | ----------------------- | ------------------ | ------------------- |
| **Verificação**       | Pós-registro            | 6 dígitos          | ✅ Ativo            |
| **Recuperação Senha** | Solicitação de reset    | 6 dígitos          | ✅ Ativo            |
| **Aviso de Login**    | Após login bem-sucedido | Detalhes de acesso | ✅ Ativo            |
| **Bem-vindo**         | Pós-registro            | N/A                | ❌ Não implementado |

---

## 🏗️ ARQUITETURA GERAL

```
FRONTEND (React)
    ↓
email-client.js (fetch para /api/*)
    ↓
API SERVERLESS (Node.js Express)
    ↓
SendGrid (primário) + Gmail SMTP (fallback)
```

---

# 1️⃣ FLUXO DE REGISTRO COM VERIFICAÇÃO EMAIL

## 1.1 Frontend: Página de Registro

**Arquivo:** `src/pages/LoginPage-new.jsx`

```jsx
// Usuário preenche e cria conta
<form onSubmit={handleRegister}>
  <input name="email" type="email" />
  <input name="password" type="password" />
  <input name="company" placeholder="Empresa/Associação" />
  <input name="phone" type="tel" /> {/* WhatsApp com DDD */}
  <input name="city" type="text" />
  <input name="address" type="text" /> {/* Apenas para vendors */}
  <textarea name="notes" /> {/* Observações */}
  <checkbox name="acceptTerms" /> Aceito os termos
</form>;

// Ao submeter:
const handleRegister = (e) => {
  e.preventDefault();
  onRegister(email, password, role, {
    company_name: company.trim(),
    phone: cleanPhone,
    city: city.trim() || null,
    address: address.trim() || null,
    notes: notes.trim() || null,
  });
};
```

## 1.2 Backend: Função de Registro

**Arquivo:** `src/lib/auth-new.js`

```javascript
export async function register(email, password, role, extra = {}) {
  // 1. VALIDAÇÕES
  if (!Object.values(ROLES).includes(role)) {
    throw new Error("Tipo de conta inválido.");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Email inválido");
  }

  const passwordValidation = validatePassword(password); // Min 8 chars, maiúscula, minúscula, número
  if (!passwordValidation.valid) {
    throw new Error(`Senha fraca: ${passwordValidation.errors.join(", ")}`);
  }

  const limiter = registerLimiter.check(email); // Rate limiting
  if (!limiter.allowed) {
    throw new Error("Muitas tentativas de registro. Tente novamente depois.");
  }

  // 2. VERIFICAR SE EMAIL JÁ EXISTE
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    throw new Error("Este email já está cadastrado. Faça login.");
  }

  // 3. GERAR CÓDIGO DE VERIFICAÇÃO
  const verificationCode = generateVerificationCode(); // 6 dígitos
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  // 4. SALVAR EM pending_registrations
  const { data: pending, error: pendingError } = await supabase
    .from("pending_registrations")
    .upsert(
      {
        email,
        name: extra.company_name?.trim() || "Usuário",
        phone: extra.phone?.trim() || "",
        role,
        city: extra.city?.trim() || null,
        notes: extra.notes?.trim() || null,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();

  if (pendingError || !pending) {
    throw new Error("Não foi possível iniciar o cadastro. Tente novamente.");
  }

  // 5. ENVIAR EMAIL (COM TRY-CATCH)
  let emailSent = false;
  try {
    const emailResult = await sendVerificationEmail(
      email,
      extra.company_name || "Usuário",
      verificationCode,
    );
    emailSent = emailResult?.success === true;
  } catch (emailError) {
    console.error("Erro ao enviar email de verificação:", emailError);
    // ⚠️  Não bloqueia o fluxo se email falhar
  }

  // 6. LOG DE AUDITORIA
  await logSecurityEvent(
    "register_pending",
    null,
    "auth",
    null,
    `email=${email} role=${role} emailSent=${emailSent}`,
  );

  // 7. RETORNAR PARA USUÁRIO VERIFICAR EMAIL
  return {
    id: pending.id,
    email,
    devCode: !emailSent ? verificationCode : undefined, // Dev mode
    emailSent,
    message: emailSent
      ? "Código de verificação enviado! Verifique seu email."
      : "Não foi possível enviar o email. Use 'Reenviar Código'.",
  };
}
```

## 1.3 Frontend: Envio do Email de Verificação

**Arquivo:** `src/lib/email-client.js`

```javascript
export async function sendVerificationEmail(
  userEmail,
  userName,
  verificationCode,
) {
  // Endpoint relativo (funciona em dev com Vite proxy + em prod com Vercel/Render)
  const endpoint = "/api/send-verification-email";

  const transient = new Set([502, 503, 504]); // Erros transientes a retry
  let lastError = null;

  // RETRY 2 vezes com 1.2s de espera
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          code: verificationCode,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));

        if (!data.success) {
          return {
            success: false,
            service: data.service || "fallback",
            message: data.message || "Email será reenviado manualmente",
          };
        }

        return {
          success: true,
          service: "api-endpoint",
          messageId: data.messageId,
          message: "Email enviado com sucesso",
        };
      }

      const errData = await response.json().catch(() => ({}));
      const message = errData.error || `Servidor retornou ${response.status}`;

      // Se erro transiente e não é última tentativa: retry
      if (!transient.has(response.status) || attempt === 2) {
        throw new Error(message);
      }

      await new Promise((resolve) => setTimeout(resolve, 1200)); // Espera para retry
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  // FALLBACK: Log warning mas não bloqueia
  console.warn(
    "⚠️ Não foi possível enviar email de verificação:",
    lastError?.message || "Falha no envio de email",
  );

  return {
    success: false,
    service: "fallback",
    message: "Email será reenviado manualmente",
  };
}
```

## 1.4 Backend: Handler do Email de Verificação

**Arquivo:** `api/send-verification-email.js`

### Estrutura HTML do Email

```javascript
const htmlBody = (code, name) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #2c5f2d; font-size: 28px; margin: 0; }
    .code-box { background: linear-gradient(135deg, #e8f5e9, #f1f8e9); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; border-left: 4px solid #2c5f2d; }
    .code { font-size: 44px; font-weight: bold; letter-spacing: 8px; color: #2c5f2d; font-family: 'Courier New', monospace; }
    .code-label { color: #666; font-size: 12px; margin-top: 10px; }
    .warning { background: #fff3e0; padding: 15px; border-radius: 5px; border-left: 4px solid #ff9800; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌾 AgroColetivo</h1>
      <p style="color:#666;margin:8px 0 0">Bem-vindo ao nosso sistema!</p>
    </div>
    <p>Olá <strong>${name}</strong>,</p>
    <p>Para confirmar seu email e acessar o AgroColetivo, use o código abaixo:</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <p class="code-label">Este código expira em 24 horas</p>
    </div>
    <div class="warning">
      <strong>⚠️ Segurança:</strong> Nunca compartilhe este código com ninguém.
    </div>
    <p>Se você não se cadastrou no AgroColetivo, ignore este email.</p>
    <div class="footer">
      <p>© 2026 AgroColetivo · Oxentech Software</p>
    </div>
  </div>
</body>
</html>`;
```

### Handler com Segurança

```javascript
export default async function handler(req, res) {
  try {
    // 1. CORS RESTRITIVO
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://agro-coletivo.vercel.app",
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    ].filter(Boolean);

    const origin = req.headers.origin || req.headers.referer?.split("/")[2];
    if (origin && allowedOrigins.some((a) => origin.includes(a))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { email, name, code } = req.body || {};

    // 2. VALIDAR ENTRADA
    const validation = validateEmailInput(email, name, code);
    if (!validation.valid) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: validation.errors,
      });
    }

    const cleanEmail = sanitizeString(email.toLowerCase());
    const cleanName = sanitizeString(name);

    // 3. RATE LIMITING (3 tentativas por 24h por email)
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(clientIp, cleanEmail);

    if (!rateCheck.allowed) {
      res.setHeader("Retry-After", rateCheck.retryAfter);
      return res.status(429).json({
        error: "Muitas tentativas de verificação. Tente novamente em 24 horas.",
        retryAfter: rateCheck.retryAfter,
      });
    }

    console.log(`📧 Enviando verificação para ${cleanEmail} (IP: ${clientIp})`);

    // 4. REGISTRAR TENTATIVA (auditoria)
    try {
      await logEmailAttempt(
        "verification",
        cleanEmail,
        cleanName,
        "✉️ Confirme seu email - AgroColetivo",
        "pending",
      );
    } catch (err) {
      console.warn("⚠️ Não foi possível log email:", err?.message);
    }

    // 5. TENTAR ENVIAR: SendGrid → Gmail
    let sent = null;
    let service = null;

    sent = await sendViaSendGrid(cleanEmail, cleanName, code);
    if (sent) service = "sendgrid";

    if (!sent) {
      console.log("📧 SendGrid falhou, tentando Gmail...");
      sent = await sendViaGmail(cleanEmail, cleanName, code);
      if (sent) service = "gmail";
    }

    // 6. ATUALIZAR LOG E RETORNAR SUCESSO
    if (sent) {
      try {
        await updateEmailLogStatus(cleanEmail, "sent", service);
      } catch (err) {
        console.warn("⚠️ Não foi possível atualizar log:", err?.message);
      }

      return res.status(200).json({
        success: true,
        message: "Email de verificação enviado com sucesso",
        service,
      });
    }

    // 7. AMBOS FALHARAM - FALLBACK SILENCIOSO
    console.log(
      "⚠️ SendGrid e Gmail falharam - retornando sucesso para não bloquear",
    );
    try {
      await updateEmailLogStatus(
        cleanEmail,
        "pending",
        "fallback",
        null,
        "Ambos SendGrid e Gmail falharam",
      );
    } catch (err) {
      console.warn("⚠️ Não foi possível atualizar log:", err?.message);
    }

    return res.status(200).json({
      success: false,
      queued: false,
      message: "Não foi possível enviar o email agora",
    });
  } catch (error) {
    console.error("❌ ERRO FATAL:", error.message);

    const message =
      process.env.NODE_ENV === "production"
        ? "Erro ao enviar email. Tente novamente."
        : error.message;

    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}
```

### Envio via SendGrid

```javascript
async function sendViaSendGrid(email, name, code) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.log("⚠️ SendGrid: SENDGRID_API_KEY não configurada");
    return null;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: "oxentech.software@gmail.com", name: "AgroColetivo" },
        subject: "✉️ Confirme seu email - AgroColetivo",
        content: [{ type: "text/html", value: htmlBody(code, name) }],
      }),
    });

    if (response.status === 202) {
      console.log(`✅ Email enviado via SendGrid para ${email}`);
      return true;
    }

    const errText = await response.text();
    console.warn(`⚠️ SendGrid erro: ${response.status}`, errText);
    return null;
  } catch (error) {
    console.warn("⚠️ SendGrid fetch error:", error.message);
    return null;
  }
}
```

### Envio via Gmail SMTP (Fallback)

```javascript
async function sendViaGmail(email, name, code) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    console.log("⚠️ Gmail: GMAIL_USER ou GMAIL_APP_PASSWORD não configuradas");
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      connectionTimeout: 5000,
      socketTimeout: 5000,
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // Timeout de 10 segundos no envio
    const sendPromise = transporter.sendMail({
      from: `"AgroColetivo" <${gmailUser}>`,
      to: email,
      subject: "✉️ Confirme seu email - AgroColetivo",
      html: htmlBody(code, name),
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gmail timeout")), 10000),
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    console.log(`✅ Email enviado via Gmail para ${email} (${info.messageId})`);
    return true;
  } catch (error) {
    console.warn("⚠️ Gmail error:", error.message);
    return null;
  }
}
```

## 1.5 Frontend: Página de Confirmação de Email

**Arquivo:** `src/pages/ConfirmEmailPage-new.jsx`

```jsx
export function ConfirmEmailPage({ pendingId, email, onVerified }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [canResend, setCanResend] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Insira todos os 6 dígitos do código.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Chama verifyEmailForRegistration do auth-new.js
      const user = await verifyEmailForRegistration(pendingId, code);
      setSuccess("✅ Email verificado com sucesso! Entrando no sistema...");

      setTimeout(() => {
        if (typeof onVerified === "function") {
          onVerified(user); // Auto-login
        }
      }, 1500);
    } catch (err) {
      setError(err.message || "Erro ao verificar email. Tente novamente.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!canResend) return;

    setResending(true);
    setError("");

    try {
      await resendVerificationCode(email, "registration");
      setSuccess("✅ Novo código enviado para seu email!");
      setCanResend(false);
      setResendCountdown(60);
      setCode("");
    } catch (err) {
      setError(err.message || "Erro ao reenviar código. Tente novamente.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <h1>✉️ Confirme seu Email</h1>
        <p>Um código de verificação foi enviado para: {email}</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode="numeric"
            maxLength="6"
            value={code}
            onChange={handleCodeChange}
            placeholder="000000"
            disabled={loading}
            autoFocus
          />

          {error && <div className="error">{error}</div>}

          <Button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Verificando..." : "Confirmar Email"}
          </Button>
        </form>

        <div>
          <p>Não recebeu o código?</p>
          <Button
            onClick={handleResendEmail}
            disabled={!canResend || resending}
          >
            {resending ? "Reenviando..." : "Reenviar Código"}
          </Button>
        </div>
      </Card>

      {success && <Toast type="success" message={success} />}
    </div>
  );
}
```

## 1.6 Backend: Verificação do Email e Criação da Conta

**Arquivo:** `src/lib/auth-new.js`

```javascript
export async function verifyEmailForRegistration(pendingId, code) {
  if (!pendingId) throw new Error("ID do cadastro é obrigatório");
  if (!code || code.length !== 6)
    throw new Error("Código de verificação inválido");

  // 1. BUSCAR REGISTRO PENDENTE
  const { data: pending } = await supabase
    .from("pending_registrations")
    .select("*")
    .eq("id", pendingId)
    .maybeSingle();

  if (!pending) {
    throw new Error("Cadastro não encontrado. Tente se registrar novamente.");
  }

  // 2. VALIDAR CÓDIGO E EXPIRAÇÃO
  if (pending.verification_code !== code) {
    throw new Error("Código de verificação inválido.");
  }

  if (Date.now() > new Date(pending.expires_at).getTime()) {
    throw new Error("Código de verificação expirado. Solicite um novo.");
  }

  // 3. CRIAR CONTA NO SUPABASE AUTH
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: pending.email,
    password: pending.password || "",
    options: {
      data: { name: pending.name },
      emailRedirectTo: undefined,
    },
  });

  if (authError || !authData?.user) {
    throw new Error(authError?.message || "Erro ao criar a conta.");
  }

  // 4. INSERIR NA TABELA users
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      id: authData.user.id,
      email: pending.email,
      email_verified: true,
      name: pending.name,
      phone: pending.phone || "",
      role: pending.role,
      city: pending.city,
      notes: pending.notes,
      active: true,
    })
    .select(
      "id, name, email, phone, role, city, notes, active, profile_photo_url",
    )
    .single();

  if (insertError) {
    throw new Error("Erro ao criar perfil. Tente novamente.");
  }

  // 5. CRIAR REGISTRO DE VENDOR SE APLICÁVEL
  if (pending.role === ROLES.VENDOR) {
    await supabase.from("vendors").insert({
      user_id: newUser.id,
      name: pending.name,
      phone: pending.phone || "",
      city: pending.city,
    });
  }

  // 6. REMOVER DO PENDING
  await supabase.from("pending_registrations").delete().eq("id", pendingId);

  return newUser; // Retorna usuário criado para fazer auto-login
}
```

---

# 2️⃣ FLUXO DE LOGIN COM AVISO DE EMAIL

## 2.1 Frontend: Página de Login

**Arquivo:** `src/pages/LoginPage-new.jsx`

```jsx
const handleLogin = (e) => {
  e.preventDefault();
  setLocalErr("");

  if (!isValidEmail(email)) {
    setLocalErr("Email inválido.");
    return;
  }
  if (!password || password.length < 6) {
    setLocalErr("Senha deve ter no mínimo 6 caracteres.");
    return;
  }

  onLogin(email, password); // Chama função do App.jsx
};
```

## 2.2 Backend: Função de Login

**Arquivo:** `src/lib/auth-new.js`

```javascript
export async function login(email, password) {
  if (!email || !email.includes("@")) throw new Error("Email inválido");
  if (!password) throw new Error("Senha obrigatória");

  const limiter = loginLimiter.check(email);
  if (!limiter.allowed) {
    throw new Error(
      `Muitas tentativas. Tente novamente em ${limiter.retryAfter}s`,
    );
  }

  // 1. AUTENTICAR COM SUPABASE
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    await logSecurityEvent(
      "login_failed",
      null,
      "auth",
      null,
      `email=${email} reason=${authError.message}`,
    );
    throw new Error("Email ou senha incorretos.");
  }

  if (!authData?.user) {
    throw new Error("Erro ao fazer login. Tente novamente.");
  }

  // 2. BUSCAR DADOS DO USUÁRIO
  const { data: userData } = await supabase
    .from("users")
    .select(
      "id, name, email, phone, role, city, notes, active, email_verified, profile_photo_url",
    )
    .eq("id", authData.user.id)
    .single();

  if (!userData) {
    throw new Error("Perfil de usuário não encontrado.");
  }

  if (!userData.active) {
    await supabase.auth.signOut();
    throw new Error("Sua conta está desativada.");
  }

  // 3. SINCRONIZAR VENDOR SE APLICÁVEL
  if (userData.role === ROLES.VENDOR) {
    const { data: vRow } = await supabase
      .from("vendors")
      .select("id, photo_url")
      .eq("user_id", userData.id)
      .maybeSingle();

    userData.vendorId = vRow?.id ?? null;
    userData.profile_photo_url = vRow?.photo_url || userData.profile_photo_url;
  }

  // 4. LOG DE AUDITORIA
  await logSecurityEvent(
    "login_success",
    userData,
    "auth",
    userData.id,
    `role=${userData.role}`,
  );

  // 5. ⭐ ENVIAR EMAIL DE AVISO (NÃO BLOQUEIA)
  try {
    const loginDetails = {
      timestamp: new Date().toISOString(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      platform:
        typeof navigator !== "undefined" ? navigator.platform : "unknown",
      language:
        typeof navigator !== "undefined" ? navigator.language : "unknown",
    };

    await sendLoginAlertEmail(
      userData.email,
      userData.name || "Usuário",
      loginDetails,
    );
  } catch (emailError) {
    console.warn("Falha ao enviar aviso de login:", emailError?.message);
    // ⚠️  Não bloqueia o login se email falhar
  }

  return userData;
}
```

## 2.3 Frontend: Envio do Email de Aviso de Login

**Arquivo:** `src/lib/email-client.js`

```javascript
export async function sendLoginAlertEmail(userEmail, userName, details = {}) {
  const endpoint = "/api/send-login-alert-email";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        name: userName,
        details,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        service: "api-endpoint",
        messageId: data.messageId,
        message: "Email de aviso de login enviado com sucesso",
      };
    }

    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Servidor retornou ${response.status}`);
  } catch (error) {
    console.warn(
      "⚠️ Não foi possível enviar email de aviso de login:",
      error?.message,
    );

    // Não bloqueia login por falha de email
    return {
      success: false,
      service: "fallback",
      message: "Login concluído sem envio do aviso por email",
    };
  }
}
```

## 2.4 Backend: Handler do Email de Aviso de Login

**Arquivo:** `api/send-login-alert-email.js`

### HTML do Email

```javascript
const htmlBody = (name, details) => {
  const when = details?.timestamp
    ? new Date(details.timestamp).toLocaleString("pt-BR")
    : new Date().toLocaleString("pt-BR");

  const device = details?.platform || "Dispositivo não identificado";
  const browser = details?.userAgent || "Navegador não identificado";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; }
    .header { text-align: center; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { color: #2c5f2d; font-size: 26px; margin: 0; }
    .info { background: #f9fafb; border-left: 4px solid #2c5f2d; padding: 14px; border-radius: 6px; margin: 16px 0; }
    .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 14px; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Aviso de Login</h1>
    </div>
    
    <p>Olá <strong>${name}</strong>,</p>
    <p>Detectamos um novo acesso à sua conta.</p>
    
    <div class="info">
      <p><strong>Data e hora:</strong> ${when}</p>
      <p><strong>Dispositivo:</strong> ${device}</p>
      <p><strong>Navegador:</strong> ${browser}</p>
    </div>
    
    <div class="warning">
      <strong>Não foi você?</strong>
      <p style="margin: 8px 0 0;">Recomendamos alterar sua senha imediatamente.</p>
    </div>
    
    <div class="footer">
      <p>© 2026 AgroColetivo · Oxentech Software</p>
    </div>
  </div>
</body>
</html>`;
};
```

### Handler

```javascript
export default async function handler(req, res) {
  try {
    // CORS + Validação
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST")
      return res.status(405).json({ error: "Método não permitido" });

    const { email, name, details } = req.body || {};

    const validation = validateLoginAlertInput(email, name, details);
    if (!validation.valid) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: validation.errors });
    }

    const cleanEmail = sanitizeString(email.toLowerCase());
    const cleanName = sanitizeString(name || "Usuário");
    // ... rate limiting e validações

    // Tentar envio Gmail (sem SendGrid para login alert)
    const sent = await sendViaGmail(cleanEmail, cleanName, cleanDetails);

    if (sent?.success) {
      return res.status(200).json({
        success: true,
        message: "Email de aviso enviado",
      });
    }

    // Fallback: não bloqueia
    return res.status(200).json({
      success: false,
      message: "Login concluído",
    });
  } catch (error) {
    console.error("❌ ERRO:", error.message);
    return res.status(500).json({ error: "Erro ao enviar email" });
  }
}
```

---

# 3️⃣ FLUXO DE RECUPERAÇÃO DE SENHA

## 3.1 Frontend: Página "Esqueci a Senha"

**Arquivo:** `src/pages/ForgotPasswordPage-new.jsx`

```jsx
export function ForgotPasswordPage({ onRequestSent, onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devCode, setDevCode] = useState(""); // Modo dev

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Email inválido.");
      return;
    }

    setLoading(true);

    try {
      const result = await startPasswordRecovery(email);

      if (result.success) {
        setSuccess(result.message);
        if (result.devCode) setDevCode(result.devCode);

        setTimeout(() => {
          if (typeof onRequestSent === "function") {
            onRequestSent(email);
          }
        }, 2000);
      }
    } catch (err) {
      setError(err.message || "Erro ao processar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h1>🔑 Recuperar Senha</h1>
      <p>Informe seu email para receber um código de verificação</p>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
        />

        {error && <div className="error">❌ {error}</div>}
        {devCode && <div className="info">🔧 Código de Teste: {devCode}</div>}

        <Button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar Código"}
        </Button>
      </form>

      {success && <Toast message={success} />}
    </Card>
  );
}
```

## 3.2 Backend: Iniciar Recuperação de Senha

**Arquivo:** `src/lib/auth-new.js`

```javascript
export async function startPasswordRecovery(email) {
  if (!email || !email.includes("@")) throw new Error("Email inválido");

  // 1. VERIFICAR SE USUÁRIO EXISTE
  const { data: user } = await supabase
    .from("users")
    .select("id, name")
    .eq("email", email)
    .maybeSingle();

  if (!user) {
    // Não revelar se email existe (segurança)
    await logSecurityEvent(
      "password_recovery_failed",
      null,
      "auth",
      null,
      `email=${email} reason=user_not_found`,
    );
    return {
      success: true,
      message: "Se este email existe, você receberá um código.",
    };
  }

  // 2. GERAR CÓDIGO
  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  // 3. SALVAR EM email_verifications
  const { error: insertError } = await supabase
    .from("email_verifications")
    .insert({
      user_id: user.id,
      code: verificationCode,
      expires_at: expiresAt.toISOString(),
      verified: false,
    });

  if (insertError) {
    throw new Error("Erro ao processar recuperação de senha.");
  }

  // 4. ENVIAR EMAIL (COM TRY-CATCH)
  let emailSent = false;
  try {
    const emailResult = await sendPasswordRecoveryEmail(
      email,
      user.name,
      verificationCode,
    );
    emailSent = emailResult?.success === true;
  } catch (err) {
    console.error("Erro ao enviar email de recuperação:", err);
  }

  await logSecurityEvent(
    "password_recovery_started",
    { email },
    "auth",
    user.id,
    `emailSent=${emailSent}`,
  );

  return {
    success: true,
    message: emailSent
      ? "Código de verificação enviado para seu email!"
      : "Se este email existe, você receberá um código.",
    devCode: !emailSent ? verificationCode : undefined,
  };
}
```

## 3.3 Backend: Email de Recuperação de Senha

**Arquivo:** `api/send-password-recovery-email.js`

### HTML do Email

```javascript
const htmlBody = (code, name) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #fff3e0; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #d97706; font-size: 28px; margin: 0; }
    .code-box { background: linear-gradient(135deg, #fef3c7, #fef9e7); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; border-left: 4px solid #d97706; }
    .code { font-size: 44px; font-weight: bold; letter-spacing: 8px; color: #d97706; font-family: 'Courier New', monospace; }
    .code-label { color: #666; font-size: 12px; margin-top: 10px; }
    .warning { background: #fee2e2; padding: 15px; border-radius: 5px; border-left: 4px solid #dc2626; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 AgroColetivo</h1>
      <p style="color:#666;margin:8px 0 0">Redefinir Senha</p>
    </div>
    <p>Olá <strong>${name}</strong>,</p>
    <p>Recebemos uma solicitação para redefinir sua senha. Use o código abaixo:</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <p class="code-label">Este código expira em 15 minutos</p>
    </div>
    <div class="warning">
      <strong>🔒 Segurança:</strong> Nunca compartilhe este código. Se você não solicitou, ignore.
    </div>
    <div class="footer">
      <p>© 2026 AgroColetivo · Oxentech Software</p>
    </div>
  </div>
</body>
</html>`;
```

### Handler (SendGrid + Gmail)

Segue o mesmo padrão do `send-verification-email.js`.

## 3.4 Frontend: Página de Reset de Senha

**Arquivo:** `src/pages/ResetPasswordPage-new.jsx`

```jsx
export function ResetPasswordPage({ email, onSuccess, onBack }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("code"); // code | password | success

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Insira todos os 6 dígitos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await resetPasswordWithCode(email, code, password || "temp");
      setStage("password");
    } catch (err) {
      setError(err.message || "Código inválido ou expirado.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await resetPasswordWithCode(email, code, password);
      setSuccess(result.message);
      setStage("success");

      setTimeout(() => {
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      }, 2000);
    } catch (err) {
      setError(err.message || "Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  };

  // ... Render de cada stage
}
```

## 3.5 Backend: Resetar Senha

**Arquivo:** `api/reset-password.js`

```javascript
export default async function handler(req, res) {
  // ... CORS + Validações

  try {
    const { email, code, newPassword } = req.body || {};

    // 1. VALIDAÇÕES
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        error: "Email, código e nova senha são obrigatórios",
      });
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        error: "Código de verificação inválido",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Senha deve ter no mínimo 6 caracteres",
      });
    }

    // 2. BUSCAR USUÁRIO
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      // Não revelar se email existe
      return res.status(200).json({
        success: true,
        message: "Se este email existe, a senha foi redefinida",
      });
    }

    // 3. VALIDAR CÓDIGO
    const { data: verification } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("code", code)
      .maybeSingle();

    if (!verification) {
      return res.status(400).json({
        error: "Código de verificação inválido",
      });
    }

    // 4. VERIFICAR EXPIRAÇÃO (15 minutos)
    if (Date.now() > new Date(verification.expires_at).getTime()) {
      return res.status(400).json({
        error: "Código expirado. Solicite uma nova recuperação.",
      });
    }

    // 5. ATUALIZAR SENHA NA SUPABASE AUTH
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword },
    );

    if (updateError) {
      return res.status(500).json({
        error: "Erro ao atualizar senha. Tente novamente.",
      });
    }

    // 6. MARCAR CÓDIGO COMO USADO
    await supabase
      .from("email_verifications")
      .update({ verified: true })
      .eq("id", verification.id);

    return res.status(200).json({
      success: true,
      message: "Senha alterada com sucesso! Você pode fazer login agora.",
    });
  } catch (error) {
    console.error("❌ ERRO:", error.message);
    return res.status(500).json({
      error: "Erro ao redefinir senha. Tente novamente.",
    });
  }
}
```

---

# 4️⃣ CONFIGURAÇÃO DE EMAIL

## Variáveis de Ambiente

**Arquivo:** `.env` (local) / Variáveis no Vercel/Render

```env
# ============================================
# EMAIL — SENDGRID (Opcional - Primário)
# ============================================
SENDGRID_API_KEY=SG.xxxx...
SENDGRID_FROM_EMAIL=oxentech.software@gmail.com
SENDGRID_FROM_NAME=AgroColetivo

# ============================================
# EMAIL — GMAIL SMTP (Ativo como Fallback)
# ============================================
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
GMAIL_SMTP_HOST=smtp.gmail.com
GMAIL_SMTP_PORT=587
```

### Como Gerar Google App Password

1. Ativar 2-Step Verification em https://myaccount.google.com
2. Ir para "App Passwords" (myaccount.google.com → Segurança)
3. Selecionar "Mail" e "Windows Computer"
4. Copiar a senha gerada (16 caracteres com espaços)
5. Usar em `GMAIL_APP_PASSWORD`

---

# 5️⃣ TRATAMENTO DE ERROS

## Frontend: email-client.js

```javascript
// RETRY automático (2 tentativas)
for (let attempt = 1; attempt <= 2; attempt++) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, code }),
    });

    if (response.ok) {
      return { success: true, ... };
    }

    // Retry em erros transientes (5xx)
    const errData = await response.json().catch(() => ({}));
    if (isTransient(response.status) && attempt < 2) {
      await sleep(1200);
      continue;
    }

    throw new Error(errData.error || `Status ${response.status}`);
  } catch (error) {
    lastError = error;
    if (attempt < 2) {
      await sleep(1200);
    }
  }
}

// FALLBACK: Não bloqueia o fluxo
console.warn("⚠️ Email falhou:", lastError?.message);
return {
  success: false,
  service: "fallback",
  message: "Email será reenviado manualmente",
};
```

## Backend: Cascata de Envio

```javascript
// 1️⃣ SendGrid
let sent = await sendViaSendGrid(email, name, code);

// 2️⃣ Se falhar, Gmail
if (!sent) {
  sent = await sendViaGmail(email, name, code);
}

// 3️⃣ Se ambos falharem: sucesso silencioso
if (!sent) {
  console.log("⚠️ Ambos falharam - retornando sucesso");
  return res.status(200).json({
    success: false,
    message: "Não foi possível enviar o email agora",
  });
}
```

## Tratamento de Exceções

| Erro            | Frontend            | Backend             | Usuário Vê                          |
| --------------- | ------------------- | ------------------- | ----------------------------------- |
| **Network**     | Retry 2x            | Não aplicável       | "Erro de conexão. Tente novamente." |
| **SendGrid ❌** | Fallback para Gmail | Tenta Gmail         | ✅ Sucesso (se Gmail OK)            |
| **Gmail ❌**    | Fallback silencioso | Fallback silencioso | ✅ "Email será processado"          |
| **Rate Limit**  | 429 response        | client.retryAfter   | ⏳ "Tente em X segundos"            |
| **Validação**   | 400 response        | N/A                 | ❌ "Dados inválidos"                |

## Console.error & Logs

```javascript
// ❌ Erros Críticos
console.error("❌ ERRO FATAL:", error.message);

// ⚠️ Avisos (não bloqueantes)
console.warn("⚠️ Não foi possível enviar:", error?.message);

// 📧 Informações
console.log("📧 Enviando verificação para", email);
console.log("✅ Email enviado via SendGrid");

// 🔧 Auditoria
await logSecurityEvent(
  "register_pending",
  null,
  "auth",
  null,
  `email=${email} emailSent=${emailSent}`,
);
```

---

# 6️⃣ BANCO DE DADOS - TABELAS ENVOLVIDAS

## pending_registrations

```sql
CREATE TABLE pending_registrations (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50),
  city VARCHAR(255),
  notes TEXT,
  verification_code VARCHAR(6),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50),
  city VARCHAR(255),
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  profile_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## email_verifications

```sql
CREATE TABLE email_verifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  code VARCHAR(6),
  expires_at TIMESTAMP WITH TIME ZONE,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## email_logs (Auditoria)

```sql
CREATE TABLE email_logs (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255),
  type VARCHAR(50), -- 'verification', 'password_recovery', 'login_alert'
  subject TEXT,
  status VARCHAR(50), -- 'pending', 'sent', 'failed'
  service VARCHAR(50), -- 'sendgrid', 'gmail', 'fallback'
  message_id TEXT,
  error_message TEXT,
  client_ip INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

# 7️⃣ RATE LIMITING

**Arquivo:** `src/lib/email-security.js`

```javascript
const RATE_LIMITS = {
  global: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50/hora por IP
  perEmail: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10/hora por email
  perUser: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100/hora por usuário
  emailVerification: { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3/dia
};

export function checkRateLimit(ip, emailAddress = null) {
  // Verificar limite por IP
  if (ipData.count >= RATE_LIMITS.global.maxRequests) {
    return {
      allowed: false,
      reason: "rate_limit_ip",
      retryAfter: calculateRetryTime(ipData),
    };
  }

  // Verificar limite por email
  if (emailAddress) {
    const emailKey = `email:${emailAddress}`;
    // ... similar logic
  }

  return { allowed: true };
}
```

---

# 8️⃣ SEGURANÇA & BEST PRACTICES

✅ **Implementado:**

- ✅ Rate limiting por IP e por email
- ✅ CORS restritivo (apenas origins permitidas)
- ✅ Validação de entrada (sanitização)
- ✅ Códigos de 6 dígitos com expiração
- ✅ Não revelar se email existe (password recovery)
- ✅ Timeout em envios (5-10 segundos)
- ✅ Logs de auditoria (security events)
- ✅ Fallback cascata (SendGrid → Gmail → Silencioso)
- ✅ Não bloqueia fluxo por falha de email

⚠️ **Considerar:**

- SMTP TLS/SSL em produção
- Redis para rate limiting distribuído
- Webhooks de delivery tracking (SendGrid)
- Bounce & complaint handling

---

# 9️⃣ ROTAS API

**Arquivo:** `server.mjs`

```javascript
// Email Verification (Registro)
POST /api/send-verification-email
{
  email: "user@example.com",
  name: "Empresa XYZ",
  code: "123456"
}

// Login Alert
POST /api/send-login-alert-email
{
  email: "user@example.com",
  name: "Empresa XYZ",
  details: {
    timestamp: "2026-03-30T10:30:00Z",
    userAgent: "Mozilla/5.0...",
    platform: "Win32",
    language: "pt-BR"
  }
}

// Password Recovery
POST /api/send-password-recovery-email
{
  email: "user@example.com",
  name: "Empresa XYZ",
  code: "654321"
}

// Password Reset (Validar código + alterar senha)
POST /api/reset-password
{
  email: "user@example.com",
  code: "654321",
  newPassword: "NewPass123"
}
```

---

# 🔟 TESTES & DEBUGGING

## Teste de Email em Desenvolvimento

1. Locar `.env` com credenciais de teste SendGrid/Gmail
2. RegisterLimiter permitirá 3 tentativas por 24h
3. `devCode` aparecerá em modo desenvolvimento (não envio real)

## Logs Úteis

```bash
# Terminal - Ver envios de email
tail -f logs/email.log

# Console do navegador
console.log() em email-client.js

# Backend
console.log() em send-verification-email.js
console.warn() em error handling
```

## Troubleshooting

| Problema             | Causa                   | Solução                                               |
| -------------------- | ----------------------- | ----------------------------------------------------- |
| Email não chega      | SMTP credentials errado | Verificar `GMAIL_APP_PASSWORD` no .env                |
| Rate limit           | Muitas tentativas       | Aguardar 24h ou resetar database                      |
| "Sender not allowed" | SendGrid config         | Verificar `SENDGRID_FROM_EMAIL`                       |
| Timeout 504          | SMTP lento              | Aumentar timeout em `email-client.js`                 |
| Código expirado      | Demora >24h             | Código válido por 24h para registro, 15min para reset |

---

## 📞 RESUMO: O QUE ACONTECE EM CADA FLUXO

### 🟢 REGISTRO

1. ✅ User preenche form
2. ✅ Backend gera código (6 dígitos) + expires 24h
3. ✅ Salva em `pending_registrations`
4. ✅ **Envia EMAIL de verificação** (SendGrid → Gmail)
5. ✅ Frontend mostra página de confirmação
6. ✅ User digita código
7. ✅ Backend cria account em Supabase Auth + users table
8. ✅ Deleta de `pending_registrations`
9. ✅ **Auto-login**

### 🟢 LOGIN

1. ✅ User coloca email + senha
2. ✅ Autentica com Supabase
3. ✅ Busca dados do usuário
4. ✅ **Envia EMAIL de aviso** (só Gmail, não bloqueia)
5. ✅ Retorna usuário para dashboard

### 🟢 RECUPERAÇÃO DE SENHA

1. ✅ User clica "Esqueci a Senha"
2. ✅ Backend gera código (6 dígitos) + expires 15min
3. ✅ **Envia EMAIL** com código
4. ✅ User digita email + código
5. ✅ Backend valida código
6. ✅ User define nova senha
7. ✅ Backend atualiza senha em Supabase Auth
8. ✅ User pode fazer novo login
