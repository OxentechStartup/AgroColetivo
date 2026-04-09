import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import {
  verifyEmailForRegistration,
  resendVerificationCode,
} from "../lib/auth-new.js";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Toast } from "../components/ui/Toast.jsx";
import { AuthShell } from "../components/AuthShell";
import { BRAND_NAME } from "../constants/branding";
import styles from "./ConfirmEmailPage.module.css";

/**
 * ConfirmEmailPage REFATORADA
 * - Verificação de código de 6 dígitos
 * - Suporte a devCode para exibir código quando email não é enviado
 * - Fluxo limpo
 */
export function ConfirmEmailPage({ pendingId, email, onVerified }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resending, setResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown para reenviar
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(
        () => setResendCountdown(resendCountdown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && !canResend) {
      setCanResend(true);
    }
  }, [resendCountdown, canResend]);

  if (!pendingId || !email) {
    return (
      <AuthShell
        kicker="Seguranca da conta"
        title="Confirmacao de email"
        subtitle={`Garanta que apenas voce consiga acessar sua conta no ${BRAND_NAME}.`}
        bullets={[
          "Fluxo protegido para gestores e fornecedores",
          "Codigo de verificacao com validade limitada",
          "Acesso liberado somente apos validacao",
        ]}
        contentMaxWidth={500}
      >
        <Card className={styles.card}>
          <div className={styles.error}>
            Dados de verificacao nao encontrados. Tente registrar novamente.
          </div>
        </Card>
      </AuthShell>
    );
  }

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
      const user = await verifyEmailForRegistration(pendingId, code);
      setSuccess("Email verificado com sucesso! Entrando no sistema...");

      // Callback para fazer login automático
      setTimeout(() => {
        if (typeof onVerified === "function") {
          onVerified(user);
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
      setSuccess("Novo código enviado para seu email!");
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
    <AuthShell
      kicker="Seguranca da conta"
      title="Confirme seu email"
      subtitle={`Use o codigo recebido para ativar seu acesso ao ${BRAND_NAME}.`}
      bullets={[
        "Validacao rapida em poucos segundos",
        "Protecao contra acessos indevidos",
        "Reenvio de codigo quando necessario",
      ]}
      contentMaxWidth={500}
    >
      <Card className={styles.card}>
        <div className={styles.header}>
          <h1>Confirme seu Email</h1>
          <p className={styles.subtitle}>
            Um código de verificação foi enviado para:
          </p>
          <p className={styles.email}>{email}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="code">Código de Verificação (6 dígitos)</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength="6"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              className={styles.codeInput}
              disabled={loading}
              autoComplete="one-time-code"
              autoFocus
            />
            <p className={styles.hint}>
              Digite o código que você recebeu no seu email
            </p>
          </div>

          {error && (
            <div className={styles.error}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading || code.length !== 6}
            block
          >
            {loading ? "Verificando..." : "Confirmar Email"}
          </Button>
        </form>

        <div className={styles.footer}>
          <p className={styles.noCode}>Não recebeu o código?</p>
          <Button
            onClick={handleResendEmail}
            variant="secondary"
            disabled={!canResend || resending}
            block
          >
            {resending
              ? "Reenviando..."
              : canResend
                ? "Reenviar Código"
                : `Reenviar em ${resendCountdown}s`}
          </Button>
        </div>

        <div className={styles.info}>
          <p>
            <strong>Dica:</strong> O codigo expira em 24 horas. Verifique a
            pasta de spam se não encontrar.
          </p>
        </div>
      </Card>

      {success && (
        <Toast type="success" message={success} onDone={() => setSuccess("")} />
      )}
    </AuthShell>
  );
}
