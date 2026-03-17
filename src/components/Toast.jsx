import { useEffect } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";
import styles from "./Toast.module.css";

/**
 * Toast — notificação temporária.
 * @param {string}   message  Texto a exibir
 * @param {"success"|"error"} type
 * @param {Function} onDone   Chamado ao fechar (timeout ou clique no X)
 */
export function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.icon}>
        {type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      </span>
      <span className={styles.msg}>{message}</span>
      <button className={styles.close} onClick={onDone} aria-label="Fechar">
        <X size={13} />
      </button>
    </div>
  );
}
