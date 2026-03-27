import styles from './ProgressBar.module.css'

export function ProgressBar({ value, goal, unit, compact = false }) {
  const pct       = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  const remaining = Math.max(0, goal - value)
  const over      = pct >= 100

  if (compact) {
    return (
      <div className={styles.wrapCompact}>
        <div className={styles.trackCompact}>
          <div className={`${styles.fill} ${over ? styles.fillOver : ''}`} style={{width:`${pct}%`}}/>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.labels}>
        <span>{value} <span style={{color:'var(--text3)'}}>{unit}</span></span>
        <span className={styles.pct}>{pct}%</span>
      </div>
      <div className={styles.track}>
        <div className={`${styles.fill} ${over ? styles.fillOver : ''}`} style={{width:`${pct}%`}}/>
      </div>
      <span style={{fontSize:'.72rem',color:'var(--text3)',marginTop:2}}>
        {over
          ? '✓ Meta atingida — pronto para cotar!'
          : `Faltam ${remaining} ${unit} para fechar o caminhão`}
      </span>
    </div>
  )
}
