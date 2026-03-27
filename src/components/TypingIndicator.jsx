import { useUserPresence } from "../hooks/useUserPresence";
import styles from "./TypingIndicator.module.css";

/**
 * TypingIndicator — Mostra quando alguém está digitando
 *
 * Exemplo:
 * <TypingIndicator campaignId="campaign-123" />
 */

export function TypingIndicator({ campaignId }) {
  const { getOnlineUsersInCampaign } = useUserPresence();

  const typingUsers = getOnlineUsersInCampaign(campaignId).filter(
    (u) => u.status === "typing",
  );

  if (typingUsers.length === 0) {
    return null;
  }

  const typingText =
    typingUsers.length === 1
      ? `${typingUsers[0].user_name} está digitando`
      : `${typingUsers.length} pessoas estão digitando`;

  return (
    <div className={styles.container}>
      <div className={styles.dots}>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
      </div>
      <span className={styles.text}>{typingText}</span>
    </div>
  );
}
