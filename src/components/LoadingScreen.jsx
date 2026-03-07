import { RefreshCw, AlertTriangle } from 'lucide-react'
import styles from './LoadingScreen.module.css'

export function LoadingScreen({ message = 'Carregando...' }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.spinner}><RefreshCw size={24} /></div>
      <p className={styles.msg}>{message}</p>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.errorIcon}><AlertTriangle size={28} /></div>
      <p className={styles.errorTitle}>Erro ao carregar</p>
      <p className={styles.errorMsg}>{message}</p>
      {onRetry && (
        <button className={styles.retryBtn} onClick={onRetry}>
          <RefreshCw size={14} /> Tentar novamente
        </button>
      )}
    </div>
  )
}
