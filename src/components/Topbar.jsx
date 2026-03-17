import { useState } from "react";
import { Menu, ExternalLink, LogOut, ChevronDown } from "lucide-react";
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
  user,
  onLogout,
  onProfile,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const role = user?.role ?? ROLES.GESTOR;
  const displayName = user?.name ?? "Usuário";
  const roleLabel = ROLE_DISPLAY[role] ?? role;

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
        <div style={{ position: "relative" }}>
          <button
            className={styles.userBtn}
            title={displayName}
            onClick={() => setMenuOpen((s) => !s)}
            style={{ display: "flex", alignItems: "center" }}
          >
            <div className={styles.avatar}>
              {displayName[0]?.toUpperCase() ?? "A"}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userRole}>{roleLabel}</span>
            </div>
            <ChevronDown size={14} style={{ marginLeft: 4, opacity: 0.6 }} />
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                zIndex: 1000,
                minWidth: 180,
                marginTop: 4,
              }}
            >
              {role === ROLES.VENDOR && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onProfile?.();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    color: "var(--text1)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  Meu Perfil
                </button>
              )}
            </div>
          )}
        </div>
        <button
          className={styles.logoutBtn}
          onClick={() => {
            setMenuOpen(false);
            onLogout?.();
          }}
          title="Sair"
        >
          <LogOut size={15} />
        </button>
      </div>

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
        />
      )}
    </header>
  );
}
