import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

export function Modal({ onClose, children, size = 'md' }) {
  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles[size]}`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  )
}

export function ModalHeader({ title, onClose }) {
  return (
    <div className={styles.header}>
      <span className={styles.title}>{title}</span>
      <button className={styles.close} onClick={onClose}><X size={16} /></button>
    </div>
  )
}

export function ModalBody({ children }) {
  return <div className={styles.body}>{children}</div>
}

export function ModalFooter({ children }) {
  return <div className={styles.footer}>{children}</div>
}
