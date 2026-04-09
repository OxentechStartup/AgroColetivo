import { useState } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import {
  verifyPasswordRecoveryCode,
  resetPasswordWithCode,
  resendVerificationCode,
} from "../lib/auth-new.js";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Toast } from "../components/ui/Toast.jsx";
import { AuthShell } from "../components/AuthShell";
import styles from "./ResetPasswordPage.module.css";

/**
 * ResetPasswordPage REFATORADA
 * - Valida código
 * - Define nova senha
 * - Volta para login
 */
export function ResetPasswordPage({ email, onSuccess, onBack }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resending, setResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [stage, setStage] = useState("code"); // code | password | success
  const passwordTooShort = password.length > 0 && password.length < 6;
  const passwordMismatch = confirm.length > 0 && password !== confirm;

  if (!email) {
    return (
      <AuthShell
        kicker="Recuperacao de acesso"
        title="Redefina sua senha"
        subtitle="Valide sua identidade para criar uma nova senha de acesso."
        bullets={[
          "Confirmacao por codigo em duas etapas",
          "Senha atualizada com seguranca",
          "Acesso liberado logo apos a validacao",
        ]}
        contentMaxWidth={560}
      >
        <Card className={styles.card}>
          <div className={styles.error}>Email nao encontrado. Tente novamente.</div>
        </Card>
      </AuthShell>
    );
  }

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setError("");
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Insira todos os 6 dígitos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await verifyPasswordRecoveryCode(email, code);
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

    if (!password || password.length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres.");
      return;
    }

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
      setError(err.message || "Erro ao alterar senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setResending(true);
    setError("");

    try {
      await resendVerificationCode(email, "password");
      setSuccess("Novo código enviado!");
      setCanResend(false);
      setTimeout(() => setCanResend(true), 60000);
    } catch (err) {
      setError(err.message || "Erro ao reenviar código.");
    } finally {
      setResending(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // STAGE 1: Validar Código
  // ──────────────────────────────────────────────────────────

  if (stage === "code") {
    return (
      <AuthShell
        kicker="Recuperacao de acesso"
        title="Confirme seu email"
        subtitle="Use o codigo recebido para seguir com a redefinicao da senha."
        bullets={[
          "Codigo numerico de 6 digitos",
          "Reenvio disponivel quando necessario",
          "Processo rapido e protegido",
      ]}
      contentMaxWidth={560}
    >
        <Card className={styles.card}>
          <div className={styles.header}>
            <button
              type="button"
              className={styles.backButton}
              onClick={onBack}
              aria-label="Voltar para recuperacao"
            >
              <ArrowLeft size={20} /> Voltar
            </button>
            <h1>Confirme seu Email</h1>
            <p className={styles.subtitle}>Digite o código enviado para:</p>
            <p className={styles.email}>{email}</p>
          </div>

          <form onSubmit={handleVerifyCode} className={styles.form}>
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
            </div>

            {error && (
              <div className={styles.error}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading || code.length !== 6}
              block
            >
              {loading ? "Verificando..." : "Confirmar Código"}
            </Button>
          </form>

          <div className={styles.footer}>
            <p>Não recebeu?</p>
            <button
              type="button"
              className={styles.resendBtn}
              onClick={handleResendCode}
              disabled={!canResend || resending}
            >
              {resending ? "Reenviando..." : "Reenviar Código"}
            </button>
          </div>
        </Card>
          {success && (
            <Toast
              type="success"
              message={success}
              onDone={() => setSuccess("")}
            />
          )}
      </AuthShell>
    );
  }

  // ──────────────────────────────────────────────────────────
  // STAGE 2: Definir Nova Senha
  // ──────────────────────────────────────────────────────────

  if (stage === "password") {
    return (
      <AuthShell
        kicker="Nova senha"
        title="Defina uma senha forte"
        subtitle="Atualize sua senha e mantenha sua conta protegida no HubCompras."
        bullets={[
          "Use letras e numeros para maior seguranca",
          "Valide os dados antes de concluir",
          "Acesso renovado imediatamente apos salvar",
      ]}
      contentMaxWidth={560}
    >
        <Card className={styles.card}>
          <div className={styles.header}>
            <h1>Defina uma Nova Senha</h1>
            <p className={styles.subtitle}>Crie uma senha forte para sua conta</p>
          </div>

          <form onSubmit={handleResetPassword} className={styles.form}>
            <div className="form-group">
              <label htmlFor="password">Nova Senha</label>
              <div className={styles.inputWrap}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  id="password"
                  className={`form-input ${styles.passwordInput}`}
                  type={showPwd ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className={styles.toggleButton}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordTooShort && (
                <p className={styles.passwordHint}>Use pelo menos 6 caracteres.</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirm">Confirmar Senha</label>
              <div className={styles.inputWrap}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  id="confirm"
                  className={`form-input ${styles.passwordInput}`}
                  type={showPwd ? "text" : "password"}
                  placeholder="Digite novamente"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {passwordMismatch ? (
                <p className={styles.passwordHint}>As senhas precisam ser iguais.</p>
              ) : (
                confirm.length > 0 && (
                  <p className={`${styles.passwordHint} ${styles.passwordHintOk}`}>
                    Senhas conferem.
                  </p>
                )
              )}
            </div>

            {error && (
              <div className={styles.error}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading || !password || password !== confirm}
              block
            >
              {loading ? "Alterando..." : "Alterar Senha"}
            </Button>
          </form>
        </Card>
          {success && (
            <Toast
              type="success"
              message={success}
              onDone={() => setSuccess("")}
            />
          )}
      </AuthShell>
    );
  }

  // ──────────────────────────────────────────────────────────
  // STAGE 3: Sucesso
  // ──────────────────────────────────────────────────────────

  if (stage === "success") {
    return (
      <AuthShell
        kicker="Senha atualizada"
        title="Tudo certo"
        subtitle="Sua nova senha foi registrada e voce ja pode acessar sua conta."
        bullets={[
          "Alteracao concluida com sucesso",
          "Login liberado com a nova senha",
          "Redirecionamento automatico para o acesso",
      ]}
      contentMaxWidth={560}
    >
        <Card className={styles.card}>
          <div className={styles.successState}>
            <CheckCircle size={64} className={styles.successIcon} />
            <h1>Senha Alterada com Sucesso</h1>
            <p>Você pode fazer login com sua nova senha agora.</p>
            <p>Redirecionando...</p>
          </div>
        </Card>
          {success && (
            <Toast
              type="success"
              message={success}
              onDone={() => setSuccess("")}
            />
          )}
      </AuthShell>
    );
  }

  return null;
}
