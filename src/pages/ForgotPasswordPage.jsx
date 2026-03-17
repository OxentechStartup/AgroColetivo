import { useState } from "react";
import { ArrowLeft, Loader, CheckCircle, AlertCircle } from "lucide-react";
import { resetPassword } from "../lib/auth";
import { maskPhone, unmaskPhone } from "../utils/masks";
import styles from "./ForgotPasswordPage.module.css";

export function ForgotPasswordPage() {
  const [screen, setScreen] = useState("request"); // request | sent | error
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const clean = unmaskPhone(phone);
      if (clean.length < 10) {
        setError("Informe um telefone válido.");
        setLoading(false);
        return;
      }

      await resetPassword(clean);
      setScreen("sent");
      setPhone("");
    } catch (err) {
      setError(err?.message || "Erro ao processar requisição.");
      setScreen("error");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = "/";
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {screen === "request" && (
          <>
            <div className={styles.header}>
              <button className={styles.backBtn} onClick={handleBack}>
                <ArrowLeft size={18} />
              </button>
              <h1 className={styles.title}>Recuperar senha</h1>
              <div style={{ width: 32 }} />
            </div>

            <p className={styles.subtitle}>
              Informe o telefone associado à sua conta e enviaremos um link de
              recuperação.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-phone">
                  WhatsApp com DDD
                </label>
                <input
                  id="reset-phone"
                  className="form-input"
                  type="tel"
                  placeholder="(38) 99111-0001"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  inputMode="tel"
                  autoFocus
                  aria-required="true"
                />
              </div>

              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading || unmaskPhone(phone).length < 10}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader size={15} className={styles.spin} />
                    Enviando…
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </button>
            </form>

            <p className={styles.hint}>
              Lembrou a senha?{" "}
              <button
                type="button"
                className={styles.hintLink}
                onClick={handleBack}
              >
                Voltar para login.
              </button>
            </p>
          </>
        )}

        {screen === "sent" && (
          <>
            <CheckCircle size={48} className={styles.success} />
            <h1 className={styles.title}>Email enviado!</h1>
            <p className={styles.subtitle}>
              Verifique sua caixa de entrada e clique no link para recuperar sua
              senha.
            </p>
            <p className={styles.hint}>
              Se não receber nada em alguns minutos, verifique a pasta de spam.
            </p>
            <button className={styles.backBtn2} onClick={handleBack}>
              ← Voltar para login
            </button>
          </>
        )}

        {screen === "error" && (
          <>
            <AlertCircle size={48} className={styles.errorIcon} />
            <h1 className={styles.title}>Erro</h1>
            <p className={styles.subtitle}>{error}</p>
            <button className={styles.backBtn2} onClick={handleBack}>
              ← Voltar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
