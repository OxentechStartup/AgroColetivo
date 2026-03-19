import { useState } from "react";
import { Menu, ExternalLink, LogOut, User, ChevronDown } from "lucide-react";
import { ROLES } from "../constants/roles";
import { NotificationBell } from "./NotificationBell";
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const role = user?.role ?? ROLES.GESTOR;

  const getInitial = () => {
    if (user?.name) return user.name[0].toUpperCase();
    return "U";
  };

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
      </div>

      {/* Notificações — apenas para gestores/admins */}
      {(role === ROLES.GESTOR || role === ROLES.ADMIN) && (
        <NotificationBell userId={user?.id} />
      )}

      {/* Perfil com dropdown */}
      <div style={{ position: "relative" }}>
        <button
          className={styles.userBtn}
          onClick={() => setShowUserMenu(!showUserMenu)}
          title={user?.name || "Perfil"}
        >
          {user?.profile_photo_url ? (
            <img
              src={user.profile_photo_url}
              alt={user.name}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatar}>{getInitial()}</div>
          )}
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name || "Usuário"}</span>
            <span className={styles.userRole}>{ROLE_DISPLAY[role]}</span>
          </div>
          <ChevronDown size={16} style={{ marginLeft: "auto" }} />
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

      {/* Botão sair — visível no mobile Se ainda precisar */}
      {/* <button className={styles.logoutBtn} onClick={onLogout} title="Sair">
        <LogOut size={15} />
      </button> */}
    </header>
  );
}
