import { useState } from "react";
import {
  Menu,
  ExternalLink,
  LogOut,
  ChevronDown,
  UserCircle,
} from "lucide-react";
import { ROLES } from "../constants/roles";
import styles from "./Topbar.module.css";

const LOGO_URL = "https://i.imgur.com/clDJyAh.png";

const ROLE_DISPLAY = {
  [ROLES.GESTOR]: "Gestor",
  [ROLES.VENDOR]: "Fornecedor",
  [ROLES.ADMIN]: "Administrador",
  [ROLES.BUYER]: "Comprador",
};

export function Topbar({
  title,
  onMenuClick,
  onPortalClick,
  onStatusOrdersClick,
  user,
  onLogout,
  onProfile,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const role = user?.role ?? ROLES.GESTOR;
  const displayName = user?.name ?? "Usuário";
  const roleLabel = ROLE_DISPLAY[role] ?? role;
  const photoUrl = user?.profile_photo_url ?? null;

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.topbar}>
      {/* Menu hamburguer (mobile) */}
      <button
        className={styles.menuBtn}
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {/* Logo mobile */}
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
        {/* Portal Produtor — apenas para gestor/admin */}
        {role !== ROLES.VENDOR && (
          <button
            className={styles.portalBtn}
            onClick={onPortalClick}
            title="Abrir portal do produtor"
          >
            <ExternalLink size={13} />
            <span>Portal Produtor</span>
          </button>
        )}

        {/* Status de Pedidos — para todos */}
        {onStatusOrdersClick && (
          <button
            className={styles.portalBtn}
            onClick={onStatusOrdersClick}
            title="Ver status dos pedidos"
          >
            <ExternalLink size={13} />
            <span>Meus Pedidos</span>
          </button>
        )}

        {/* Dropdown do usuário */}
        <div style={{ position: "relative" }}>
          <button
            className={styles.userBtn}
            onClick={() => setMenuOpen((s) => !s)}
            title={displayName}
          >
            <div className={styles.avatar}>
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <span
                style={{
                  display: photoUrl ? "none" : "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                }}
              >
                {displayName[0]?.toUpperCase() ?? "A"}
              </span>
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userRole}>{roleLabel}</span>
            </div>
            <ChevronDown size={14} style={{ marginLeft: 4, opacity: 0.6 }} />
          </button>

          {menuOpen && (
            <div className={styles.dropdown}>
              <button
                className={styles.dropItem}
                onClick={() => {
                  closeMenu();
                  onProfile?.();
                }}
              >
                <UserCircle size={15} />
                Meu Perfil
              </button>
              <div className={styles.dropDivider} />
              <button
                className={`${styles.dropItem} ${styles.dropItemDanger}`}
                onClick={() => {
                  closeMenu();
                  onLogout?.();
                }}
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          )}
        </div>

        {/* Botão sair — visível no mobile */}
        <button className={styles.logoutBtn} onClick={onLogout} title="Sair">
          <LogOut size={15} />
        </button>
      </div>

      {/* Overlay para fechar dropdown */}
      {menuOpen && (
        <div
          onClick={closeMenu}
          style={{ position: "fixed", inset: 0, zIndex: 999 }}
        />
      )}
    </header>
  );
}
