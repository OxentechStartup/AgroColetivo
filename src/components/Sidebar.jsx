import { LayoutDashboard, ClipboardList, Users, Store, X } from 'lucide-react'
import styles from './Sidebar.module.css'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',  Icon: LayoutDashboard },
  { id: 'campaigns', label: 'Cotações',   Icon: ClipboardList },
  { id: 'producers', label: 'Produtores', Icon: Users },
  { id: 'vendors',   label: 'Vendedores', Icon: Store },
]

export function Sidebar({ page, setPage, open, onClose }) {
  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>

        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <img src="https://i.imgur.com/uPDoDdf.jpeg" alt="AgroColetivo" />
          </div>
          <div className={styles.logoText}>
            <div className={styles.brand}>AgroColetivo</div>
            <div className={styles.tagline}>Compras Coletivas</div>
          </div>
          {/* X só aparece no mobile via CSS */}
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar menu">
            <X size={16} />
          </button>
        </div>

        <nav className={styles.nav}>
          <p className={styles.navLabel}>Menu</p>
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`${styles.navItem} ${page === id ? styles.active : ''}`}
              onClick={() => { setPage(id); onClose() }}
            >
              <Icon size={16} />
              <span>{label}</span>
              {page === id && <span className={styles.activeDot} />}
            </button>
          ))}
        </nav>

        <div className={styles.footer}>
          <span className={styles.footerVersion}>v1.0 · MVP</span>
        </div>
      </aside>
    </>
  )
}
