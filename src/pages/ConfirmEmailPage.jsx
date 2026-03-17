import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import { supabase } from "../lib/supabase";
import styles from "./ConfirmEmailPage.module.css";

export function ConfirmEmailPage({ onConfirmed }) {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Extrai o hash da URL (#access_token=..., etc)
        const hash = window.location.hash;
        if (!hash) {
          setStatus("error");
          setMessage("Link de confirmação inválido ou expirado.");
          return;
        }

        // O Supabase Auth atualiza automaticamente a sessão quando o hash está presente
        // Aguarda um momento para a sessão ser atualizada
        await new Promise((r) => setTimeout(r, 1500));

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setStatus("error");
          setMessage("Falha ao confirmar email. Tente fazer login novamente.");
          return;
        }

        // Verifica se o email foi confirmado
        if (!session.user.email_confirmed_at) {
          setStatus("error");
          setMessage("Email ainda não foi confirmado. Tente novamente.");
          return;
        }

        setStatus("success");
        setMessage("Email confirmado com sucesso!");

        // Redireciona após 2 segundos
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } catch (error) {
        console.error("Erro ao confirmar email:", error);
        setStatus("error");
        setMessage("Erro ao confirmar email. Tente novamente.");
      }
    };

    confirmEmail();
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {status === "loading" && (
          <>
            <Loader size={48} className={styles.spin} />
            <h1 className={styles.title}>Confirmando seu email...</h1>
            <p className={styles.message}>
              Por favor, aguarde enquanto verificamos seu email.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle size={48} className={styles.success} />
            <h1 className={styles.title}>Parabéns!</h1>
            <p className={styles.message}>{message}</p>
            <p className={styles.hint}>Você será redirecionado em breve...</p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle size={48} className={styles.error} />
            <h1 className={styles.title}>Erro na confirmação</h1>
            <p className={styles.message}>{message}</p>
            <a href="/" className={styles.backLink}>
              ← Voltar para home
            </a>
          </>
        )}
      </div>
    </div>
  );
}
