import styles from './Button.module.css'

export function Button({
  children, variant = 'primary', size = 'md',
  block = false, disabled = false,
  onClick, href, target, rel, type = 'button',
}) {
  const cls = [styles.btn, styles[variant], styles[size], block ? styles.block : '']
    .filter(Boolean).join(' ')

  if (href) return <a className={cls} href={href} target={target} rel={rel}>{children}</a>

  return (
    <button className={cls} type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}
