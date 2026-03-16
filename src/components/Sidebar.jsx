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
  Store,
  Package,
} from "lucide-react";
import { ROLES, ROLE_LABELS } from "../constants/roles";
import styles from "./Sidebar.module.css";

const NAV_GESTOR = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "campaigns", label: "Cotações", Icon: ClipboardList },
  { id: "vendors", label: "Fornecedores", Icon: Store },
  { id: "producers", label: "Compradores", Icon: Users },
  { id: "financial", label: "Financeiro", Icon: DollarSign },
];

const NAV_ADMIN = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "campaigns", label: "Cotações", Icon: ClipboardList },
  { id: "vendors", label: "Fornecedores", Icon: Store },
  { id: "producers", label: "Compradores", Icon: Users },
  { id: "admin", label: "Monitoramento", Icon: ShieldCheck },
  { id: "financial", label: "Financeiro", Icon: DollarSign },
];

const NAV_VENDOR = [
  { id: "vendor-dashboard", label: "Propostas", Icon: Send },
  { id: "vendor-products", label: "Meus Produtos", Icon: Package },
  { id: "vendor-profile", label: "Meu Perfil", Icon: UserSquare2 },
  { id: "vendor-pivos", label: "Gestores", Icon: Users },
];

const ROLE_BADGES = {
  [ROLES.GESTOR]: { label: "Gestor", cls: "roleGestor" },
  [ROLES.ADMIN]: { label: "Admin", cls: "roleAdmin" },
  [ROLES.VENDOR]: { label: "Fornecedor", cls: "roleVendor" },
};

export function Sidebar({ page, setPage, open, onClose, user, blocked }) {
  const role = user?.role ?? ROLES.GESTOR;
  const nav =
    role === ROLES.ADMIN
      ? NAV_ADMIN
      : role === ROLES.VENDOR
        ? NAV_VENDOR
        : NAV_GESTOR;
  const ri = ROLE_BADGES[role] ?? ROLE_BADGES[ROLES.GESTOR];

  const displayName = user?.name ?? user?.username ?? "Usuário" ?? "—";

  return (
    <>
      <div
        className={[styles.overlay, open ? styles.overlayOpen : ""].join(" ")}
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <div className={styles.brandRow}>
          <img
            src="https://i.imgur.com/clDJyAh.png"
            alt="AgroColetivo"
            width="28"
            height="28"
            style={{ borderRadius: 7, objectFit: "cover", flexShrink: 0 }}
          />
          <span className={styles.brandName}>AgroColetivo</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

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
      </aside>
    </>
  );
}
