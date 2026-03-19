import React, { useState, useEffect } from "react";
import { verifyEmail, resendVerificationEmail } from "../lib/auth.js";
import { Card } from "../components/Card.jsx";
import { Button } from "../components/Button.jsx";
import { Toast } from "../components/Toast.jsx";
import styles from "./ConfirmEmailPage.module.css";

export function ConfirmEmailPage({ onVerified, devCode, emailSent }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resending, setResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Pega o email e pendingId da localStorage (salvo no signUp)
  const user = JSON.parse(
    localStorage.getItem("agro_pending_registration") || "{}",
  );
  const email = user?.email || "";
  const pendingId = user?.id || "";

  console.log("📧 ConfirmEmailPage carregada - dados recuperados:", {
    email,
    pendingId,
    fullUser: user,
  });

  // Verificar localStorage imediatamente quando a página carrega
  useEffect(() => {
    const rawData = localStorage.getItem("agro_pending_registration");
    console.log("💾 localStorage.getItem('agro_auth'):", rawData);
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        console.log("✅ JSON.parse bem-sucedido:", parsed);
        console.log("  - id:", parsed?.id, typeof parsed?.id);
        console.log("  - email:", parsed?.email);
      } catch (e) {
        console.error("❌ Erro ao fazer parse do localStorage:", e.message);
      }
    } else {
      console.error("❌ localStorage.agro_auth está vazio/null!");
    }
  }, []);

  // Countdown para reenviar email
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

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Por favor, insira todos os 6 dígitos do código.");
      return;
    }

    if (!pendingId) {
      setError("ID do cadastro não encontrado. Tente registrar novamente.");
      console.error("❌ pendingId está vazio/undefined:", {
        pendingId,
        fullUser: user,
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const verifyResult = await verifyEmail(pendingId, code);
      setSuccess("Email verificado com sucesso! Entrando no sistema...");

      // Se veio da tela de registro/login bloqueado, chama callback para fazer login real
      if (typeof onVerified === "function") {
        setTimeout(() => onVerified(verifyResult), 1500);
      } else {
        // Rota direta /auth/confirmar-email: redireciona para login
        setTimeout(() => {
          localStorage.removeItem("agro_pending_registration");
          window.location.href = "/";
        }, 2000);
      }
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
      await resendVerificationEmail(pendingId);
      setSuccess("Novo código enviado para seu email!");
      setCanResend(false);
      setResendCountdown(60);
      setCode("");
    } catch (err) {
      setError(err.message || "Erro ao reenviar email. Tente novamente.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Card className={styles.card}>
          <div className={styles.header}>
            <h1>✉️ Confirme seu Email</h1>
            <p className={styles.subtitle}>
              {emailSent === false
                ? "⚠️ Não foi possível enviar o email. Use o botão abaixo para reenviar."
                : "Um código de verificação foi enviado para:"}
            </p>
            <p className={styles.email}>{email || "seu email"}</p>
            {/* Mostra código em desenvolvimento quando email não foi enviado */}
            {devCode && (
              <div
                style={{
                  background: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: 12, color: "#856404" }}>
                  🛠️ Modo dev — código gerado:
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 28,
                    fontWeight: "bold",
                    letterSpacing: 6,
                    color: "#856404",
                  }}
                >
                  {devCode}
                </p>
              </div>
            )}
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

            {error && <div className={styles.error}>{error}</div>}

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
              <strong>💡 Dica:</strong> O código expira em 24 horas. Se não
              conseguir encontrá-lo, verifique sua pasta de spam.
            </p>
          </div>
        </Card>

        <div className={styles.support}>
          <p>Já tem conta verificada?</p>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "var(--primary)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
            onClick={() => {
              localStorage.removeItem("agro_auth");
              window.location.reload();
            }}
          >
            Voltar ao Login
          </button>
        </div>
      </div>

      {success && (
        <Toast type="success" message={success} onDone={() => setSuccess("")} />
      )}
    </div>
  );
}
