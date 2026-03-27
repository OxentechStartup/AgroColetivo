import { AlertTriangle } from "lucide-react";
import { Modal } from "./ui/Modal";
import styles from "./ConfirmationModal.module.css";

/**
 * Modal de confirmação reutilizável
 * @param {object} props
 * @param {string} props.title - Título do modal
 * @param {string} props.message - Mensagem de confirmação
 * @param {string} props.confirmText - Texto do botão confirmar (default: "Confirmar")
 * @param {string} props.cancelText - Texto do botão cancelar (default: "Cancelar")
 * @param {boolean} props.isDestructive - Se é ação destrutiva (botão vermelho)
 * @param {function} props.onConfirm - Callback ao confirmar
 * @param {function} props.onCancel - Callback ao cancelar
 * @param {boolean} props.open - Se o modal está aberto
 * @param {boolean} props.loading - Se está carregando (desabilita botões)
 */
export function ConfirmationModal({
  title = "Confirmação",
  message = "Tem certeza que deseja continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDestructive = false,
  onConfirm,
  onCancel,
  open = false,
  loading = false,
}) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className={styles.content}>
        {isDestructive && (
          <div className={styles.alert}>
            <AlertTriangle size={20} />
          </div>
        )}
        <p className={styles.message}>{message}</p>
      </div>

      <div className={styles.actions}>
        {cancelText && (
          <button
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
        )}
        <button
          className={`${styles.confirmBtn} ${
            isDestructive ? styles.destructive : ""
          }`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Processando..." : confirmText}
        </button>
      </div>
    </Modal>
  );
}
