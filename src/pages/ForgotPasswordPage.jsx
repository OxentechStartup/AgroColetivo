import { useState, useEffect } from "react";
import { ArrowLeft, Loader, CheckCircle, AlertCircle } from "lucide-react";
import { resetPassword, resetPasswordByEmail } from "../lib/auth";
import { maskPhone, unmaskPhone } from "../utils/masks";
import styles from "./ForgotPasswordPage.module.css";

export function ForgotPasswordPage() {
  const [screen, setScreen] = useState("request"); // request | sent | error
  const [tab, setTab] = useState("email"); // phone | email (default to email for legacy users)
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentVia, setSentVia] = useState("email"); // para mensagem condicional de sucesso
  const [isLegacyMigration, setIsLegacyMigration] = useState(false);

  // Check for legacy user email on mount
  useEffect(() => {
    const legacyEmail = localStorage.getItem("agro_legacy_email");
    if (legacyEmail) {
      setEmail(legacyEmail);
      setTab("email");
      setIsLegacyMigration(true);
      localStorage.removeItem("agro_legacy_email");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "phone") {
        const clean = unmaskPhone(phone);
        if (clean.length < 10) {
          setError("Informe um telefone válido.");
          setLoading(false);
          return;
        }
        await resetPassword(clean);
      } else {
        if (!email || !email.includes("@")) {
          setError("Informe um email válido.");
          setLoading(false);
          return;
        }
        await resetPasswordByEmail(email);
      }
      setSentVia(tab);
      setScreen("sent");
      setPhone("");
      setEmail("");
    } catch (err) {
      setError(
        err?.message ||
        "Não foi possível processar sua solicitação. Verifique os dados e tente novamente."
      );
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
              {isLegacyMigration 
                ? "Sua conta precisa ser atualizada. Informe seu email para receber o link de redefinição de senha:"
                : "Escolha como deseja recuperar sua senha:"}
            </p>

            {!isLegacyMigration && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 20,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                onClick={() => setTab("phone")}
                style={{
                  padding: "8px 12px",
                  background: "none",
                  border: "none",
                  borderBottom:
                    tab === "phone" ? "2px solid var(--primary)" : "none",
                  color: tab === "phone" ? "var(--primary)" : "var(--text2)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: tab === "phone" ? 600 : 500,
                }}
              >
                Por Telefone
              </button>
              <button
                type="button"
                onClick={() => setTab("email")}
                style={{
                  padding: "8px 12px",
                  background: "none",
                  border: "none",
                  borderBottom:
                    tab === "email" ? "2px solid var(--primary)" : "none",
                  color: tab === "email" ? "var(--primary)" : "var(--text2)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: tab === "email" ? 600 : 500,
                }}
              >
                Por Email
              </button>
            </div>
            )}

            <form onSubmit={handleSubmit}>
              {tab === "phone" ? (
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
              ) : (
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-email">
                    Email da conta
                  </label>
                  <input
                    id="reset-email"
                    className="form-input"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    aria-required="true"
                  />
                </div>
              )}

              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={
                  loading ||
                  (tab === "phone"
                    ? unmaskPhone(phone).length < 10
                    : !email || !email.includes("@"))
                }
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader size={15} className={styles.spin} />
                    Enviando…
                  </>
                ) : tab === "phone" ? (
                  "Enviar link de recuperação"
                ) : (
                  "Enviar email de recuperação"
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
            <h1 className={styles.title}>
              {sentVia === "phone" ? "Solicitação enviada!" : "Email enviado!"}
            </h1>
            <p className={styles.subtitle}>
              {sentVia === "phone"
                ? "Se o telefone informado estiver cadastrado, você receberá um link de recuperação no email associado."
                : "Verifique sua caixa de entrada e clique no link para criar uma nova senha."}
            </p>
            <p className={styles.hint}>
              Não recebeu nada em alguns minutos? Verifique a pasta de spam ou{" "}
              <button
                type="button"
                className={styles.hintLink}
                onClick={() => { setScreen("request"); setError(""); }}
              >
                tente novamente.
              </button>
            </p>
            <button className={styles.backBtn2} onClick={handleBack}>
              ← Voltar para login
            </button>
          </>
        )}

        {screen === "error" && (
          <>
            <AlertCircle size={48} className={styles.errorIcon} />
            <h1 className={styles.title}>Não conseguimos processar</h1>
            <p className={styles.subtitle}>
              {error || "Verifique os dados informados e tente novamente."}
            </p>
            <button
              className={styles.submitBtn}
              onClick={() => { setScreen("request"); setError(""); }}
            >
              Tentar novamente
            </button>
            <button className={styles.backBtn2} onClick={handleBack}>
              ← Voltar para login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
