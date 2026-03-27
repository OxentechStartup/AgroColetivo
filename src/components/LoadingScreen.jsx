import { AlertTriangle } from 'lucide-react'
import styles from './LoadingScreen.module.css'

export function LoadingScreen({ message = 'Carregando...' }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.spinner} aria-label="Carregando" role="status" />
      <p className={styles.msg}>{message}</p>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.errorIconWrap}>
        <AlertTriangle size={28} />
      </div>
      <p className={styles.errorTitle}>Algo deu errado</p>
      <p className={styles.errorMsg}>
        {message || 'Não foi possível carregar os dados. Verifique sua conexão e tente novamente.'}
      </p>
      {onRetry && (
        <button className={styles.retryBtn} onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  )
}
