import { useState } from "react";
import { Trash2, AlertTriangle, Eye, EyeOff, Loader } from "lucide-react";
import styles from "./Modal.module.css";

export function DeleteAccountModal({ user, onDelete, onCancel, loading }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Informe sua senha para confirmar.");
      return;
    }

    setDeleting(true);
    try {
      await onDelete(password);
    } catch (err) {
      setError(err.message || "Erro ao deletar conta.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--danger)",
            }}
          >
            <AlertTriangle size={20} />
            <h2>Deletar Conta</h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onCancel}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(220, 53, 69, 0.1)",
              border: "1px solid rgba(220, 53, 69, 0.3)",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <p
              style={{ color: "var(--danger)", fontSize: "0.9rem", margin: 0 }}
            >
              <strong>Atenção:</strong> Esta ação é irreversível. Sua conta,
              perfil e todos os dados serão deletados permanentemente.
            </p>
          </div>

          <p
            style={{
              color: "var(--text2)",
              fontSize: "0.9rem",
              marginBottom: 12,
            }}
          >
            Para confirmar, informe sua senha:
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="delete-password">
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="delete-password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDelete(e)}
                autoFocus
                disabled={deleting || loading}
              />
              <button
                type="button"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text3)",
                  display: "flex",
                  alignItems: "center",
                }}
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Ocultar" : "Mostrar"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                color: "var(--danger)",
                fontSize: "0.85rem",
                marginTop: 8,
              }}
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={deleting || loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn"
            style={{ background: "var(--danger)", color: "white" }}
            onClick={handleDelete}
            disabled={!password || deleting || loading}
            aria-busy={deleting || loading}
          >
            {deleting || loading ? (
              <Loader
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <>
                <Trash2 size={14} style={{ marginRight: 6 }} />
                Deletar Conta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
