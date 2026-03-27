import { useAppData } from "../hooks/useAppData";
import styles from "./RealtimeStatusIndicator.module.css";

/**
 * RealtimeStatusIndicator — Mostra status de sincronização em tempo real
 *
 * Aparece no canto inferior direito e mostra:
 * - 🟢 Sincronizado (verde piscando)
 * - 🟡 Sincronizando (amarelo)
 * - 🔴 Desconectado (vermelho)
 */

export function RealtimeStatusIndicator() {
  const { realTimeActive } = useAppData();

  return (
    <div className={styles.container}>
      <div
        className={`${styles.indicator} ${realTimeActive ? styles.active : styles.inactive}`}
      >
        <span className={styles.dot}></span>
        <span className={styles.text}>
          {realTimeActive ? "Sincronizando" : "Offline"}
        </span>
      </div>
    </div>
  );
}
