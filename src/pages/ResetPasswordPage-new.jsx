import { useState } from "react";
import {
  Loader,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import {
  resetPasswordWithCode,
  resendVerificationCode,
} from "../lib/auth-new.js";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Toast } from "../components/ui/Toast.jsx";
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

  if (!email) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <div className={styles.error}>
            ❌ Email não encontrado. Tente novamente.
          </div>
        </Card>
      </div>
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
      // Validar código passando valores vazios para password (apenas valida código)
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
      setSuccess("✅ Novo código enviado!");
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
      <div className={styles.container}>
        <div className={styles.content}>
          <Card className={styles.card}>
            <div className={styles.header}>
              <button
                type="button"
                className={styles.backButton}
                onClick={onBack}
              >
                <ArrowLeft size={20} /> Voltar
              </button>
              <h1>🔐 Confirme seu Email</h1>
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
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // STAGE 2: Definir Nova Senha
  // ──────────────────────────────────────────────────────────

  if (stage === "password") {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Card className={styles.card}>
            <div className={styles.header}>
              <h1>🔑 Define uma Nova Senha</h1>
              <p className={styles.subtitle}>
                Crie uma senha forte para sua conta
              </p>
            </div>

            <form onSubmit={handleResetPassword} className={styles.form}>
              <div className="form-group">
                <label htmlFor="password">Nova Senha</label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={18}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      color: "var(--text2)",
                    }}
                  />
                  <input
                    id="password"
                    className="form-input"
                    type={showPwd ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    style={{ paddingLeft: 40, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text2)",
                    }}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm">Confirmar Senha</label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={18}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      color: "var(--text2)",
                    }}
                  />
                  <input
                    id="confirm"
                    className="form-input"
                    type={showPwd ? "text" : "password"}
                    placeholder="Digite novamente"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="off"
                    style={{ paddingLeft: 40 }}
                  />
                </div>
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
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // STAGE 3: Sucesso
  // ──────────────────────────────────────────────────────────

  if (stage === "success") {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Card className={styles.card}>
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <CheckCircle
                size={64}
                color="#22c55e"
                style={{ marginBottom: 16 }}
              />
              <h1>✅ Senha Alterada com Sucesso!</h1>
              <p>Você pode fazer login com sua nova senha agora.</p>
              <p>Redirecionando...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
