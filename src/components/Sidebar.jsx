import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ShieldCheck,
  Send,
  UserSquare2,
  X,
  Lock,
  DollarSign,
  Package,
} from "lucide-react";
import { ROLES } from "../constants/roles";
import styles from "./Sidebar.module.css";

const NAV_GESTOR = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "campaigns", label: "Cotações", Icon: ClipboardList },
  { id: "producers", label: "Parceiros", Icon: Users },
  { id: "financial", label: "Financeiro", Icon: DollarSign },
];

const NAV_ADMIN = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "campaigns", label: "Cotações", Icon: ClipboardList },
  { id: "producers", label: "Parceiros", Icon: Users },
  { id: "admin", label: "Monitoramento", Icon: ShieldCheck },
  { id: "financial", label: "Financeiro", Icon: DollarSign },
];

const NAV_VENDOR = [
  { id: "vendor-dashboard", label: "Propostas", Icon: Send },
  { id: "vendor-pivos", label: "Gestores", Icon: Users },
];

// Mapeamento de role → classe CSS (corrigido "Gestort" → "Gestor")
const ROLE_CSS = {
  [ROLES.GESTOR]: styles.roleGestor,
  [ROLES.ADMIN]: styles.roleAdmin,
  [ROLES.VENDOR]: styles.roleVendor,
};

const ROLE_LABEL = {
  [ROLES.GESTOR]: "Gestor",
  [ROLES.ADMIN]: "Admin",
  [ROLES.VENDOR]: "Fornecedor",
};

export function Sidebar({ page, setPage, open, onClose, user, blocked }) {
  const role = user?.role ?? ROLES.GESTOR;
  const nav =
    role === ROLES.ADMIN
      ? NAV_ADMIN
      : role === ROLES.VENDOR
        ? NAV_VENDOR
        : NAV_GESTOR;

  const displayName = user?.name ?? user?.username ?? "Usuário";
  const roleCls = ROLE_CSS[role] ?? styles.roleGestor;
  const roleLabel = ROLE_LABEL[role] ?? "Gestor";

  return (
    <>
      <div
        className={[styles.overlay, open ? styles.overlayOpen : ""].join(" ")}
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        {/* Marca */}
        <div className={styles.brandRow}>
          <img
            src="https://i.imgur.com/clDJyAh.png"
            alt="AgroColetivo"
            width="28"
            height="28"
            style={{ borderRadius: 7, objectFit: "cover", flexShrink: 0 }}
          />
          <span className={styles.brandName}>AgroColetivo</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navegação */}
        <nav className={styles.nav}>
          {nav.map(({ id, label, Icon }) => {
            const isLocked = blocked && id !== "dashboard";
            return (
              <button
                key={id}
                className={[
                  styles.navItem,
                  page === id ? styles.navActive : "",
                  isLocked ? styles.navLocked : "",
                ].join(" ")}
                onClick={() => {
                  if (!isLocked) {
                    setPage(id);
                    onClose();
                  }
                }}
                disabled={isLocked}
                title={
                  isLocked ? "Acesso bloqueado pelo administrador" : undefined
                }
              >
                <Icon size={16} />
                <span>{label}</span>
                {isLocked && <Lock size={13} className={styles.lockIcon} />}
              </button>
            );
          })}
        </nav>

        {/* Chip do usuário */}
        <div className={styles.userChip}>
          <div className={styles.userAvatar}>
            {displayName[0]?.toUpperCase() ?? "A"}
          </div>
          <div className={styles.userNameWrap}>
            <span className={styles.userNameText}>{displayName}</span>
            <span className={`${styles.userRole} ${roleCls}`}>{roleLabel}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
