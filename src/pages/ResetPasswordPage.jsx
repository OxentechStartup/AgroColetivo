import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Loader, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { updatePassword } from "../lib/auth";
import styles from "./ResetPasswordPage.module.css";

export function ResetPasswordPage() {
  const [status, setStatus] = useState("verifying"); // verifying | form | success | error
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Aguarda a sessão ser atualizada pelo Supabase Auth do hash
        await new Promise((r) => setTimeout(r, 1000));

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setStatus("error");
          setError("Link de recuperação inválido ou expirado.");
          return;
        }

        setStatus("form");
      } catch (err) {
        console.error("Erro ao verificar sessão:", err);
        setStatus("error");
        setError("Erro ao processar link de recuperação.");
      }
    };

    verifySession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Senha deve ter ao menos 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setStatus("success");
    } catch (err) {
      setError(err?.message || "Erro ao atualizar senha.");
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = "/";
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {status === "verifying" && (
          <>
            <Loader size={48} className={styles.spin} />
            <h1 className={styles.title}>Verificando link...</h1>
            <p className={styles.message}>Aguarde um momento.</p>
          </>
        )}

        {status === "form" && (
          <>
            <h1 className={styles.title}>Alterar senha</h1>
            <p className={styles.subtitle}>
              Informe uma nova senha para sua conta.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">
                  Nova senha *
                </label>
                <div className={styles.passWrap}>
                  <input
                    id="new-password"
                    className="form-input"
                    type={showPwd ? "text" : "password"}
                    placeholder="min. 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-required="true"
                    aria-invalid={error && password === "" ? "true" : "false"}
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPwd((s) => !s)}
                    aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPwd}
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">
                  Confirmar senha *
                </label>
                <input
                  id="confirm-password"
                  className="form-input"
                  type="password"
                  placeholder="repita a senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-required="true"
                  aria-invalid={error && confirm === "" ? "true" : "false"}
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
                disabled={loading || password.length < 6 || !confirm}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader size={15} className={styles.spin} />
                    Alterando…
                  </>
                ) : (
                  "Alterar senha"
                )}
              </button>
            </form>

            <p className={styles.hint}>
              <button
                type="button"
                className={styles.hintLink}
                onClick={handleBack}
              >
                Voltar para login
              </button>
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle size={48} className={styles.success} />
            <h1 className={styles.title}>Sucesso!</h1>
            <p className={styles.subtitle}>
              Sua senha foi alterada com sucesso.
            </p>
            <button className={styles.backBtn2} onClick={handleBack}>
              ← Voltar para login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle size={48} className={styles.errorIcon} />
            <h1 className={styles.title}>Erro</h1>
            <p className={styles.subtitle}>{error}</p>
            <button className={styles.backBtn2} onClick={handleBack}>
              ← Voltar para login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
