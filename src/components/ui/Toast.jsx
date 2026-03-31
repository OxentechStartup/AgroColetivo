import { useEffect } from "react";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import styles from "./Toast.module.css";

const ICONS = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

/**
 * Toast — notificação temporária.
 * @param {string}   message  Texto a exibir
 * @param {"success"|"error"|"warning"|"info"} type
 * @param {Function} onDone   Chamado ao fechar (timeout ou clique no X)
 */
export function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);

  const Icon = ICONS[type] ?? ICONS.success;

  return (
    <div
      className={`${styles.toast} ${styles[type] ?? ""}`}
      role="alert"
      aria-live="polite"
    >
      <span className={styles.icon}>
        <Icon size={15} />
      </span>
      <span className={styles.msg}>{message}</span>
      <button className={styles.close} onClick={onDone} aria-label="Fechar">
        <X size={13} />
      </button>
    </div>
  );
}
