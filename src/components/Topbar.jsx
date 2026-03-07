import { Menu, ExternalLink, LogOut } from 'lucide-react'
import styles from './Topbar.module.css'

const TITLES = {
  dashboard: 'Dashboard',
  campaigns: 'Cotações',
  producers: 'Produtores',
  vendors:   'Vendedores',
}

export function Topbar({ page, onMenuClick, onPortalClick, user, onLogout }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Menu">
          <Menu size={20} />
        </button>
        <div className={styles.breadcrumb}>
          <span className={styles.bSub}>AgroColetivo</span>
          <span className={styles.bSep}>/</span>
          <span className={styles.bPage}>{TITLES[page]}</span>
        </div>
      </div>

      <div className={styles.right}>
        {/* Desktop: botão com texto | Mobile: só ícone */}
        <button className={styles.portalBtn} onClick={onPortalClick} title="Portal do Produtor">
          <ExternalLink size={13} />
          <span className={styles.pText}>Portal do Produtor</span>
        </button>

        {/* Avatar chip — desktop mostra nome, mobile só avatar */}
        <div className={styles.userChip}>
          <div className={styles.avatar}>{user?.username?.[0]?.toUpperCase() ?? 'A'}</div>
          <span className={styles.uname}>{user?.username ?? 'admin'}</span>
        </div>

        <button className={styles.logoutBtn} onClick={onLogout} title="Sair">
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
