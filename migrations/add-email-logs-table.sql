-- ============================================================
-- Migração: Adicionar tabela email_logs para auditoria
-- ============================================================
-- Objetivo: Registrar todos os emails enviados para auditoria,
--           debugging e conformidade com regulações (GDPR/CCPA)
-- ============================================================

-- 1. Criar tabela de logs de emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  TEXT NOT NULL,  -- 'verification', 'order', 'proposal', 'notification'
  recipient_email       TEXT NOT NULL,
  recipient_name        TEXT,
  subject               TEXT NOT NULL,
  template_id           TEXT,
  status                TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'failed', 'bounced'
  service               TEXT NOT NULL DEFAULT 'gmail',    -- 'gmail', 'sendgrid', 'ethereal'
  message_id            TEXT,
  error_message         TEXT,
  attempt               INTEGER DEFAULT 1,
  max_attempts          INTEGER DEFAULT 3,
  user_id               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  related_id            UUID,  -- campaign_id, order_id, proposal_id, etc
  related_type          TEXT,  -- 'campaign', 'order', 'proposal', etc
  sent_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS email_logs_type_idx ON public.email_logs(type);
CREATE INDEX IF NOT EXISTS email_logs_status_idx ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS email_logs_recipient_idx ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS email_logs_created_idx ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_user_idx ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS email_logs_related_idx ON public.email_logs(related_type, related_id);

-- 2. Adicionar colunas para rastrear falhas em pending_registrations
ALTER TABLE public.pending_registrations
  ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_verification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_failed_attempts INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS pending_reg_verification_attempts_idx 
  ON public.pending_registrations(verification_attempts);

-- 3. Adicionar colunas para rastrear notificações em usuarios
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verified_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_notification_preferences JSONB DEFAULT '{"order_updates": true, "proposal_updates": true, "marketing": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;

-- 4. Criar função para atualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS email_logs_updated_at_trigger ON public.email_logs;
CREATE TRIGGER email_logs_updated_at_trigger
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

-- 5. Criar view para análise de emails
CREATE OR REPLACE VIEW v_email_statistics AS
SELECT
  type,
  status,
  service,
  DATE(created_at) as sent_date,
  COUNT(*) as total_emails,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
  COUNT(CASE WHEN status IN ('failed', 'bounced') THEN 1 END) as failed,
  ROUND(
    COUNT(CASE WHEN status = 'sent' THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as success_rate,
  COUNT(DISTINCT recipient_email) as unique_recipients
FROM public.email_logs
GROUP BY type, status, service, DATE(created_at)
ORDER BY DATE(created_at) DESC, type;

-- 6. Criar view para emails com falha (retentar)
CREATE OR REPLACE VIEW v_failed_emails_to_retry AS
SELECT
  id,
  type,
  recipient_email,
  recipient_name,
  subject,
  service,
  error_message,
  attempt,
  max_attempts,
  created_at,
  updated_at,
  CASE 
    WHEN attempt < max_attempts AND (now() - updated_at) > interval '5 minutes' THEN true
    ELSE false
  END as should_retry
FROM public.email_logs
WHERE status = 'failed' AND attempt < max_attempts
ORDER BY updated_at ASC;

-- 7. Criar função para registrar email enviado
CREATE OR REPLACE FUNCTION log_email_sent(
  p_type TEXT,
  p_recipient_email TEXT,
  p_recipient_name TEXT,
  p_subject TEXT,
  p_template_id TEXT,
  p_service TEXT,
  p_message_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.email_logs (
    type,
    recipient_email,
    recipient_name,
    subject,
    template_id,
    service,
    message_id,
    status,
    user_id,
    related_id,
    related_type,
    sent_at
  ) VALUES (
    p_type,
    p_recipient_email,
    p_recipient_name,
    p_subject,
    p_template_id,
    p_service,
    p_message_id,
    'sent',
    p_user_id,
    p_related_id,
    p_related_type,
    now()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar função para registrar falha de email
CREATE OR REPLACE FUNCTION log_email_failed(
  p_email_id UUID,
  p_error_message TEXT,
  p_attempt INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.email_logs
  SET 
    status = CASE 
      WHEN p_attempt >= max_attempts THEN 'failed'
      WHEN p_attempt > 1 THEN 'pending'
      ELSE 'failed'
    END,
    error_message = p_error_message,
    attempt = p_attempt,
    updated_at = now()
  WHERE id = p_email_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Permissões (RLS - Row Level Security)
-- ============================================================
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admin pode ver todos os logs
CREATE POLICY email_logs_admin_view ON public.email_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.users 
      WHERE role IN ('admin', 'pivo')
    )
  );

-- Usuários podem ver apenas seus próprios logs
CREATE POLICY email_logs_user_view ON public.email_logs
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    auth.uid() IN (
      SELECT id FROM public.users 
      WHERE role IN ('admin', 'pivo')
    )
  );

-- Apenas sistema pode inserir
CREATE POLICY email_logs_insert ON public.email_logs
  FOR INSERT
  WITH CHECK (true);  -- Controlado no backend via JWT

COMMIT;

-- ============================================================
-- Próximos passos:
-- 1. Atualizar send-verification-email.js para registrar logs
-- 2. Atualizar send-notification-emails.js para registrar logs
-- 3. Criar endpoint /api/email-logs/stats para dashboard
-- 4. Implementar rate limiting
-- ============================================================
