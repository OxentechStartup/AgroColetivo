import styles from './Card.module.css'

export function Card({ children, className = '', accent }) {
  return (
    <div className={`${styles.card} ${accent ? styles[`accent_${accent}`] : ''} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children }) {
  return <div className={styles.header}>{children}</div>
}

export function CardTitle({ children }) {
  return <span className={styles.title}>{children}</span>
}

export function CardBody({ children, noPad = false }) {
  return <div className={`${styles.body} ${noPad ? styles.noPad : ''}`}>{children}</div>
}
