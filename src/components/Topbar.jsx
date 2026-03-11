import { Menu, ExternalLink, LogOut } from 'lucide-react'
import styles from './Topbar.module.css'

const ROLE_LABEL = { pivo: 'Pivô', admin: 'Admin', vendor: 'Fornecedor' }

export function Topbar({ title, onMenuClick, onPortalClick, user, onLogout, onProfile }) {
  const role = user?.role ?? 'pivo'
  return (
    <header className={styles.topbar}>
      <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Menu">
        <Menu size={18}/>
      </button>

      <span className={styles.title}>{title}</span>

      <div className={styles.actions}>
        {role !== 'vendor' && (
          <button className={styles.portalBtn} onClick={onPortalClick} title="Portal do Produtor">
            <ExternalLink size={13}/>
            <span>Portal Produtor</span>
          </button>
        )}
        <button
          className={styles.userBtn}
          title={role === 'vendor' ? 'Meu Perfil' : `${user?.name} · ${ROLE_LABEL[role] ?? role}`}
          onClick={role === 'vendor' ? onProfile : undefined}
          style={role === 'vendor' ? {cursor:'pointer'} : {cursor:'default'}}
        >
          <div className={styles.avatar}>{user?.name?.[0]?.toUpperCase() ?? 'A'}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name ?? 'Usuário'}</span>
            <span className={styles.userRole}>{ROLE_LABEL[role] ?? role}</span>
          </div>
        </button>
        <button className={styles.logoutBtn} onClick={onLogout} title="Sair">
          <LogOut size={15}/>
        </button>
      </div>
    </header>
  )
}
