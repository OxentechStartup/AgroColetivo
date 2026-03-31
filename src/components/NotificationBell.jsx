import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabase";
import { subscribeToNotifications } from "../lib/realtimeSubscriptions";

export function NotificationBell({ userId }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Carregar notificações não lidas
  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("pivo_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      setNotifications(data ?? []);
      setUnreadCount(data?.length ?? 0);
    };

    loadNotifications();

    // Subscribe a novas notificações
    const unsubscribe = subscribeToNotifications(userId, (payload) => {
      if (payload.eventType === "INSERT") {
        setNotifications((prev) => [payload.new, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const markAsRead = async (notificationId) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("pivo_id", userId)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (!userId) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          position: "relative",
          padding: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6B7280",
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => (e.target.style.color = "#1F2937")}
        onMouseLeave={(e) => (e.target.style.color = "#6B7280")}
        title="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "0",
              right: "0",
              background: "#DC2626",
              color: "white",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              fontSize: ".7rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificações */}
      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: "0",
            background: "white",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            minWidth: "320px",
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: 1000,
            marginTop: "8px",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #E5E7EB",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: ".95rem",
                fontWeight: 600,
                color: "#1F2937",
              }}
            >
              Notificações
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#16A34A",
                  fontSize: ".8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Marcar como lido
              </button>
            )}
          </div>

          {/* Lista de notificações */}
          {notifications.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#6B7280",
                fontSize: ".9rem",
              }}
            >
              Nenhuma notificação
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #F3F4F6",
                  cursor: "pointer",
                  background: notif.read
                    ? "transparent"
                    : "rgba(16, 185, 129, 0.05)",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F3F4F6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notif.read
                    ? "transparent"
                    : "rgba(16, 185, 129, 0.05)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: notif.read ? 400 : 600,
                      color: "#1F2937",
                      fontSize: ".9rem",
                    }}
                  >
                    {notif.title}
                  </span>
                  {!notif.read && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        background: "#16A34A",
                        borderRadius: "50%",
                        marginLeft: "8px",
                        marginTop: "3px",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                <p
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: ".8rem",
                    color: "#6B7280",
                    lineHeight: 1.4,
                  }}
                >
                  {notif.message}
                </p>
                <time
                  style={{
                    fontSize: ".7rem",
                    color: "#9CA3AF",
                  }}
                >
                  {new Date(notif.created_at).toLocaleString("pt-BR")}
                </time>
              </div>
            ))
          )}
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {showDropdown && (
        <div
          onClick={() => setShowDropdown(false)}
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
    </div>
  );
}
