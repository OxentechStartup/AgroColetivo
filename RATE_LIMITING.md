# Distributed Rate Limiting Guide

## Overview

AgroColetivo agora suporta **distributed rate limiting** usando Supabase para rastrear tentativas de autenticação, registro e outras ações em múltiplas instâncias da aplicação (importante para ambientes serverless como Vercel).

## Current Implementation

### In-Memory Rate Limiting (Local)

Atualmente, o código usa limitadores em memória:

```javascript
// src/utils/security.js
export const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 tentativas por 15 minutos
export const registerLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 registros por hora
export const apiLimiter = new RateLimiter(30, 60 * 1000); // 30 requisições por minuto
```

**Problema**: Em ambientes serverless (Vercel), cada instância tem sua própria memória, então rate limiting não é compartilhado entre usuários em instâncias diferentes.

## How to Enable Distributed Rate Limiting

### 1. Create Rate Limit Logs Table in Supabase

Execute o seguinte SQL no Supabase SQL Editor:

```sql
-- Cria tabela para registrar tentativas
CREATE TABLE rate_limit_logs (
  id BIGSERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  attempted_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para performance na query
CREATE INDEX idx_rate_limit_logs_identifier_action
ON rate_limit_logs(identifier, action, attempted_at DESC);

-- Limpeza automática de logs antigos (opcional - executa todo dia)
-- Excluir logs com mais de 30 dias
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

### 2. Enable Row Level Security (RLS)

```sql
-- Habilita RLS
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Política: permitir inserção (sem restrição, necessária para rate limiting funcionar)
CREATE POLICY "Allow insertion for rate limiting"
ON rate_limit_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política: usuários autenticados podem ler seus próprios logs
CREATE POLICY "Users can read their own logs"
ON rate_limit_logs
FOR SELECT
TO authenticated
USING (auth.uid()::text = identifier);

-- Política: serviço pode ler todos os logs (importante para Triggers/Functions)
CREATE POLICY "Service role can read all logs"
ON rate_limit_logs
FOR SELECT
TO authenticated
USING (auth.role() = 'service_role');
```

### 3. Update auth.js to Use Distributed Rate Limiting

Modifique `src/lib/auth.js`:

```javascript
import { supabase, phoneToEmail } from "./supabase";
import { checkDistributedRateLimit } from "../utils/security";

// ... outras importações

export async function login(phone, password) {
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) throw new Error(phoneValidation.error);

  const clean = phoneValidation.clean;

  // ✅ Use distributed rate limiting instead of in-memory
  try {
    const limiter = await checkDistributedRateLimit(
      clean,
      "login",
      5, // max 5 attempts
      15 * 60, // per 15 minutes
      supabase,
    );

    if (!limiter.allowed) {
      throw new Error(
        `Muitas tentativas. Tente novamente em ${limiter.retryAfter}s`,
      );
    }
  } catch (error) {
    // Se falhar, usa o limitador em memória como fallback
    const localLimiter = loginLimiter.check(clean);
    if (!localLimiter.allowed) {
      throw new Error(
        `Muitas tentativas. Tente novamente em ${localLimiter.retryAfter}s`,
      );
    }
  }

  // ... rest of login logic
}

export async function register(phone, password, role, extra = {}) {
  // ... validations

  const clean = phoneValidation.clean;

  // ✅ Use distributed rate limiting
  try {
    const limiter = await checkDistributedRateLimit(
      clean,
      "register",
      3, // max 3 attempts
      60 * 60, // per 1 hour
      supabase,
    );

    if (!limiter.allowed) {
      throw new Error("Muitas tentativas de registro. Tente novamente depois");
    }
  } catch (error) {
    // Fallback para in-memory limiter
    const localLimiter = registerLimiter.check(clean);
    if (!localLimiter.allowed) {
      throw new Error("Muitas tentativas de registro. Tente novamente depois");
    }
  }

  // ... rest of register logic
}
```

## Rate Limiting Limits

### Login

- **Max Attempts**: 5
- **Window**: 15 minutes
- **Identifier**: Phone number

### Register

- **Max Attempts**: 3
- **Window**: 1 hour
- **Identifier**: Phone number

### Password Reset

- **Max Attempts**: 3
- **Window**: 1 hour
- **Identifier**: Phone number

## Monitoring Rate Limiting

### View Rate Limit Logs

```sql
-- Últimas tentativas de login
SELECT identifier, action, attempted_at, COUNT(*) as attempts
FROM rate_limit_logs
WHERE action = 'login'
  AND attempted_at > NOW() - INTERVAL '1 hour'
GROUP BY identifier, action
ORDER BY attempted_at DESC;

-- Identificar usuários bloqueados
SELECT identifier, COUNT(*) as total_attempts
FROM rate_limit_logs
WHERE action = 'login'
  AND attempted_at > NOW() - INTERVAL '15 minutes'
GROUP BY identifier
HAVING COUNT(*) >= 5
ORDER BY total_attempts DESC;
```

### Clean Up Old Logs

```sql
-- Limpar logs com mais de 30 dias
DELETE FROM rate_limit_logs
WHERE created_at < NOW() - INTERVAL '30 days';
```

## Fallback Strategy

O código atual implementa uma estratégia de **fallback**:

1. Tenta usar rate limiting distribuído (Supabase)
2. Se falhar por qualquer motivo, usa rate limiting em memória
3. Se ambos falharem, permite a requisição (fail-open mas loggado)

Isso garante que a aplicação nunca quebra por problemas de rate limiting.

## Future Improvements

1. **Vercel Redis**: Usar `@vercel/kv` para cache distribuído mais rápido
2. **Webhook Notifications**: Alertar admins sobre atividade suspeita (múltiplas tentativas)
3. **Adaptive Rate Limiting**: Aumentar limite para usuários confiáveis, diminuir para comportamento suspeito
4. **Geographic Rate Limiting**: Diferentes limites por região geográfica
5. **CAPTCHA Integration**: Após X tentativas falhas, exigir CAPTCHA

## Testing

### Local Testing

```javascript
// No console do navegador, simule tentativas de login falhas
for (let i = 0; i < 6; i++) {
  // Tenta 6 vezes (limite é 5)
  await signIn("38999110001", "wrong-password").catch((e) =>
    console.log(e.message),
  );
}
// Console: "Muitas tentativas. Tente novamente em Xs"
```

### Production Testing

1. Use Supabase CLI para verificar tabela:

   ```bash
   supabase db pull  # Se tiver schema sync
   ```

2. Veja logs em tempo real:
   ```sql
   SELECT * FROM rate_limit_logs
   WHERE action = 'login'
   ORDER BY attempted_at DESC
   LIMIT 20;
   ```

## Security Considerations

- ✅ Identifiers (telefone) não revelam usuários existentes
- ✅ Limites aumentam progressivamente (5 tentativas, depois 15 min)
- ✅ Logs preservam IP (para análise forense)
- ✅ RLS garante que usuários não vejam logs uns dos outros
- ✅ Sem cookies/session vulneráveis (rate limit por telefone)

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Rate Limiting Guide](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Vercel KV + Edge Functions](https://vercel.com/docs/edge-middleware/kv)
