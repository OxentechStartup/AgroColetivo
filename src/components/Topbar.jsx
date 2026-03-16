import { Menu, ExternalLink, LogOut } from "lucide-react";
import { ROLES } from "../constants/roles";
import styles from "./Topbar.module.css";

const LOGO_URL = "https://i.imgur.com/clDJyAh.png";

const ROLE_DISPLAY = {
  [ROLES.GESTOR]:  "Gestor",
  [ROLES.VENDOR]:  "Fornecedor",
  [ROLES.ADMIN]:   "Administrador",
  [ROLES.BUYER]:   "Comprador",
};

export function Topbar({
  title,
  onMenuClick,
  onPortalClick,
  user,
  onLogout,
  onProfile,
}) {
  const role = user?.role ?? ROLES.GESTOR;
  const displayName = user?.name ?? "Usuário";
  const roleLabel   = ROLE_DISPLAY[role] ?? role;

  return (
    <header className={styles.topbar}>
      <button
        className={styles.menuBtn}
        onClick={onMenuClick}
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>

      {/* Logo visível apenas no mobile */}
      <div className={styles.mobileLogo}>
        <img
          src={LOGO_URL}
          alt="AgroColetivo"
          width="28"
          height="28"
          style={{ borderRadius: 7, objectFit: "cover", flexShrink: 0 }}
        />
        <span className={styles.mobileLogoText}>AgroColetivo</span>
      </div>

      <span className={styles.title}>{title}</span>

      <div className={styles.actions}>
        {role !== ROLES.VENDOR && (
          <button
            className={styles.portalBtn}
            onClick={onPortalClick}
            title="Portal do Produtor"
          >
            <ExternalLink size={13} />
            <span>Portal Produtor</span>
          </button>
        )}
        <button
          className={styles.userBtn}
          title={role === ROLES.VENDOR ? "Meu Perfil" : displayName}
          onClick={role === ROLES.VENDOR ? onProfile : undefined}
          style={{ cursor: role === ROLES.VENDOR ? "pointer" : "default" }}
        >
          <div className={styles.avatar}>
            {displayName[0]?.toUpperCase() ?? "A"}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.userRole}>{roleLabel}</span>
          </div>
        </button>
        <button className={styles.logoutBtn} onClick={onLogout} title="Sair">
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
