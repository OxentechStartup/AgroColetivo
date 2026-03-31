import styles from './Card.module.css'
export function Card({ children, className = '' }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>
}
export function CardHeader({ children }) {
  return <div className={styles.header}>{children}</div>
}
export function CardTitle({ children }) {
  return <h3 className={styles.title}>{children}</h3>
}
export function CardBody({ children, noPad }) {
  return <div className={`${styles.body} ${noPad ? styles.noPad : ''}`}>{children}</div>
}
