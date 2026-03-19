import { useState } from "react";
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
  User,
  LogOut,
  ChevronUp,
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

export function Sidebar({
  page,
  setPage,
  open,
  onClose,
  user,
  blocked,
  onProfile,
  onLogout,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
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

        {/* Perfil do usuário com dropdown */}
        <div style={{ position: "relative" }}>
          <button
            className={styles.userChip}
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={displayName}
            style={{ width: "100%", cursor: "pointer" }}
          >
            <div className={styles.userAvatar}>
              {user?.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={displayName}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                (displayName[0]?.toUpperCase() ?? "A")
              )}
            </div>
            <div className={styles.userNameWrap}>
              <span className={styles.userNameText}>{displayName}</span>
              <span className={`${styles.userRole} ${roleCls}`}>
                {roleLabel}
              </span>
            </div>
            <ChevronUp
              size={16}
              style={{
                marginLeft: "auto",
                transition: "transform 0.2s",
                transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <>
              <div
                className={styles.dropdown}
                onClick={(e) => e.stopPropagation()}
              >
                {onProfile && (
                  <button
                    className={styles.dropItem}
                    onClick={() => {
                      onProfile();
                      setShowUserMenu(false);
                    }}
                  >
                    <User size={16} />
                    Editar Perfil
                  </button>
                )}
                {onProfile && <div className={styles.dropDivider} />}
                {onLogout && (
                  <button
                    className={styles.dropItem}
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                )}
              </div>
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }}
                onClick={() => setShowUserMenu(false)}
              />
            </>
          )}
        </div>
      </aside>
    </>
  );
}
