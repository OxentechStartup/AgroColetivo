import { useUserPresence } from "../hooks/useUserPresence";
import styles from "./OnlineUsers.module.css";

/**
 * OnlineUsers — Componente que exibe usuários online
 *
 * Mostra:
 * - Avatar do usuário
 * - Nome
 * - Status (ativo, inativo, digitando)
 * - Última atividade
 */

export function OnlineUsers({ campaignId, maxDisplay = 5 }) {
  const { getOnlineUsersInCampaign, onlineUsers } = useUserPresence();

  // Se não especificar campaignId, mostrar todos os usuários online
  const usersToDisplay = campaignId
    ? getOnlineUsersInCampaign(campaignId)
    : Object.values(onlineUsers).filter((u) => u.status !== "offline");

  const displayedUsers = usersToDisplay.slice(0, maxDisplay);
  const remainingCount = Math.max(0, usersToDisplay.length - maxDisplay);

  if (displayedUsers.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>Online agora:</div>
      <div className={styles.usersList}>
        {displayedUsers.map((user) => (
          <div key={user.user_id} className={styles.userItem}>
            <div className={styles.avatarContainer}>
              <div
                className={`${styles.avatar} ${styles[`status-${user.status}`]}`}
              >
                {user.user_name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div
                className={`${styles.statusIndicator} ${styles[`status-${user.status}`]}`}
              />
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {user.user_name || user.user_email}
              </div>
              <div className={styles.userRole}>{user.role || "User"}</div>
            </div>
          </div>
        ))}
      </div>

      {remainingCount > 0 && (
        <div className={styles.moreUsers}>
          +{remainingCount} {remainingCount === 1 ? "pessoa" : "pessoas"} online
        </div>
      )}
    </div>
  );
}
