import styles from './Badge.module.css'

export function Badge({ status, children }) {
  return <span className={`${styles.badge} ${styles[status] ?? styles.open}`}>{children}</span>
}
