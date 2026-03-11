import { useState } from 'react'
import {
  LayoutDashboard, ClipboardList, Users, ShieldCheck,
  Store, Package, UserSquare2, X, Lock,
} from 'lucide-react'
import styles from './Sidebar.module.css'

const NAV_PIVOT = [
  { id: 'dashboard',  label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'campaigns',  label: 'Cotações',      Icon: ClipboardList   },
  { id: 'producers',  label: 'Produtores',    Icon: Users           },
]

const NAV_ADMIN = [
  { id: 'dashboard',  label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'campaigns',  label: 'Cotações',      Icon: ClipboardList   },
  { id: 'producers',  label: 'Produtores',    Icon: Users           },
  { id: 'admin',      label: 'Financeiro',    Icon: ShieldCheck     },
]

const NAV_VENDOR = [
  { id: 'vendor-dashboard', label: 'Cotações',       Icon: ClipboardList  },
  { id: 'vendor-products',  label: 'Meus Produtos',  Icon: Package        },
  { id: 'vendor-pivos',     label: 'Pivôs',          Icon: UserSquare2    },
]

const ROLE_LABELS = {
  pivo:   { label: 'Pivô / Gestor', cls: 'rolePivot' },
  admin:  { label: 'Admin',         cls: 'roleAdmin' },
  vendor: { label: 'Fornecedor',    cls: 'roleVendor' },
}

export function Sidebar({ page, setPage, open, onClose, user, blocked }) {
  const role = user?.role ?? 'pivo'
  const nav  = role === 'admin' ? NAV_ADMIN : role === 'vendor' ? NAV_VENDOR : NAV_PIVOT
  const ri   = ROLE_LABELS[role] ?? ROLE_LABELS.pivo

  const displayName = user?.name
    ?? user?.username
    ?? 'Usuário'
    ?? '—'

  return (
    <>
      <div className={[styles.overlay, open ? styles.overlayOpen : ""].join(" ")} onClick={onClose}/>
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.brandRow}>
          <img src="https://i.imgur.com/clDJyAh.png" alt="AgroColetivo" width="28" height="28" style={{ borderRadius: 7, objectFit: "cover", flexShrink: 0 }}/>
          <span className={styles.brandName}>AgroColetivo</span>
          <button className={styles.closeBtn} onClick={onClose}><X size={16}/></button>
        </div>

        <nav className={styles.nav}>
          {nav.map(({ id, label, Icon }) => {
            const isLocked = blocked && id !== 'dashboard'
            return (
              <button
                key={id}
                className={[styles.navItem, page === id ? styles.navActive : '', isLocked ? styles.navLocked : ''].join(' ')}
                onClick={() => { if (!isLocked) { setPage(id); onClose() } }}
                disabled={isLocked}
                title={isLocked ? 'Acesso bloqueado pelo administrador' : undefined}
              >
                <Icon size={16}/>
                <span>{label}</span>
                {isLocked && <Lock size={13} className={styles.lockIcon}/>}
              </button>
            )
          })}
        </nav>


      </aside>
    </>
  )
}
