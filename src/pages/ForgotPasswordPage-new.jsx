import { useState } from "react";
import { Loader, Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import { startPasswordRecovery } from "../lib/auth-new.js";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Toast } from "../components/ui/Toast.jsx";
import { AuthShell } from "../components/AuthShell";
import styles from "./ForgotPasswordPage.module.css";

/**
 * ForgotPasswordPage REFATORADA
 * - Solicita email
 * - Envia código por email
 * - Redireciona para reset
 */
export function ForgotPasswordPage({ onRequestSent, onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devCode, setDevCode] = useState("");

  const isValidEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setDevCode("");

    if (!isValidEmail(email)) {
      setError("Email inválido.");
      return;
    }

    setLoading(true);

    try {
      const result = await startPasswordRecovery(email);

      if (result.success) {
        setSuccess(result.message);
        if (result.devCode) {
          setDevCode(result.devCode);
        }

        // Redirecionar para reset após 2s
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
    <AuthShell
      kicker="Recuperacao de acesso"
      title="Recupere sua senha"
      subtitle="Receba um codigo de verificacao para redefinir sua senha com seguranca."
      bullets={[
        "Codigo enviado para o email informado",
        "Fluxo protegido com validacao por etapa",
        "Retorno rapido para o painel apos reset",
      ]}
      contentMaxWidth={520}
    >
        <Card className={styles.card}>
          <div className={styles.header}>
            <button
              type="button"
              className={styles.backButton}
              onClick={onBack}
              aria-label="Voltar para login"
            >
              <ArrowLeft size={20} /> Voltar
            </button>
            <div className={styles.headerBadge}>
              <ShieldCheck size={14} /> Recuperacao segura
            </div>
            <h1>Recuperar Senha</h1>
            <p className={styles.subtitle}>
              Informe seu email para receber um código de verificação
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className={styles.inputWrap}>
                <Mail size={18} className={styles.inputIcon} />
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value.toLowerCase().trim())
                  }
                  autoComplete="off"
                />
              </div>
            </div>

            {error && <div className={styles.error}>❌ {error}</div>}

            {devCode && (
              <div className={styles.devCode}>
                <strong>🔧 Código de Teste:</strong> {devCode}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading || !isValidEmail(email)}
              block
            >
              {loading ? (
                <>
                  <Loader size={16} className="spin" /> Enviando...
                </>
              ) : (
                "Enviar Código"
              )}
            </Button>
          </form>

          <div className={styles.info}>
            <p>
              Se o email estiver registrado, você receberá um código de
              verificação em alguns minutos.
            </p>
          </div>
        </Card>

      {success && (
        <Toast type="success" message={success} onDone={() => setSuccess("")} />
      )}
    </AuthShell>
  );
}
