import { Menu, ExternalLink } from "lucide-react";
import { ROLES } from "../constants/roles";
import { NotificationBell } from "./NotificationBell";
import styles from "./Topbar.module.css";

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
}) {
  const role = user?.role ?? ROLES.GESTOR;

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
    </header>
  );
}
