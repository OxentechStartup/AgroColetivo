import { useEffect, useState } from "react";
import { useAppData } from "../hooks/useAppData";
import styles from "./RealtimeNotifications.module.css";

/**
 * RealtimeNotifications — Mostra notificações quando dados são sincronizados
 *
 * Monitora quando há mudanças nas propostas, pedidos, campanhas e mostra
 * notificações visuais para o gestor saber que dados novos chegaram.
 *
 * Exemplo:
 * <RealtimeNotifications />
 */

export function RealtimeNotifications() {
  const { notifications, liveNotifications, campaigns, systemEvents } =
    useAppData();

  const [visibleNotifications, setVisibleNotifications] = useState([]);

  // Monitorar mudanças importantes
  useEffect(() => {
    if (!liveNotifications?.length) return;

    // Adicionar última notificação à lista visível
    const lastNotif = liveNotifications[0];

    // Evitar duplicatas
    if (visibleNotifications.some((n) => n.id === lastNotif.id)) return;

    setVisibleNotifications((prev) => [lastNotif, ...prev].slice(0, 5));

    // Auto-remover após 5 segundos
    const timer = setTimeout(() => {
      setVisibleNotifications((prev) =>
        prev.filter((n) => n.id !== lastNotif.id),
      );
    }, 5000);

    return () => clearTimeout(timer);
  }, [liveNotifications, visibleNotifications]);

  // Monitorar eventos do sistema
  useEffect(() => {
    if (!systemEvents?.length) return;

    const lastEvent = systemEvents[0];

    // Mostrar notificação para eventos importantes
    if (
      lastEvent.type?.includes("offer") ||
      lastEvent.type?.includes("order")
    ) {
      const notif = {
        id: lastEvent.id,
        title: `Nova ${lastEvent.type === "offer_created" ? "Proposta" : "Atividade"}`,
        message: lastEvent.type,
        type: "info",
      };

      if (visibleNotifications.some((n) => n.id === notif.id)) return;

      setVisibleNotifications((prev) => [notif, ...prev].slice(0, 5));

      const timer = setTimeout(() => {
        setVisibleNotifications((prev) =>
          prev.filter((n) => n.id !== notif.id),
        );
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [systemEvents, visibleNotifications]);

  if (visibleNotifications.length === 0) return null;

  return (
    <div className={styles.container}>
      {visibleNotifications.map((notif) => (
        <div
          key={notif.id}
          className={`${styles.notification} ${styles[notif.type || "info"]}`}
        >
          <span className={styles.icon}>
            {notif.type === "success" && "✓"}
            {notif.type === "error" && "✕"}
            {notif.type === "info" && "ℹ"}
            {notif.type === "warning" && "!"}
          </span>

          <div className={styles.content}>
            <strong>{notif.title}</strong>
            {notif.message && <p>{notif.message}</p>}
          </div>

          <button
            className={styles.close}
            onClick={() =>
              setVisibleNotifications((prev) =>
                prev.filter((n) => n.id !== notif.id),
              )
            }
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
