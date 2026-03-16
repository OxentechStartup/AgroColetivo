import React from "react";
import styles from "./DemoModeBanner.module.css";

/**
 * Banner que aparece quando o app está em modo de demonstração
 * (usando dados fake porque a chave Supabase não é válida)
 */
export function DemoModeBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.icon}>⚠️</div>
        <div className={styles.text}>
          <strong>Modo de Demonstração</strong>
          <p>{message}</p>
          <small>
            Para usar dados reais, configure VITE_SUPABASE_ANON_KEY em .env
          </small>
        </div>
        <button className={styles.close} onClick={onDismiss}>
          ✕
        </button>
      </div>
    </div>
  );
}
