import { useEffect, useState } from "react";
import { useAppData } from "../hooks/useAppData";
import { useUserPresence } from "../hooks/useUserPresence";
import { useRealtimeSync } from "../hooks/useRealtimeSync";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import { OnlineUsers } from "../components/OnlineUsers";
import { TypingIndicator } from "../components/TypingIndicator";
import { Card } from "../components/ui/Card";
import styles from "./CampaignRealtimeExample.module.css";

/**
 * Página de Exemplo: CampaignRealtimeExample
 *
 * Esta página demonstra como usar o novo sistema de realtime:
 * - Mostrar usuários online
 * - Indicador de digitação
 * - Sincronização automática de dados
 * - Atividades em tempo real
 *
 * Use esta página como referência para integrar realtime em outras páginas.
 */

export function CampaignRealtimeExample({ campaignId = "campaign-1" }) {
  // ─────────────────────────────────────────────────────────────────────────
  // HOOKS
  // ─────────────────────────────────────────────────────────────────────────

  const { campaigns, realTimeActive, addNotification, liveNotifications } =
    useAppData();

  const { onlineUsers, userActivity, recordActivity, updateUserPresence } =
    useUserPresence();

  const { sync, isRealTimeActive } = useRealtimeSync(campaignId, () => {
    addNotification({
      title: "Dados Sincronizados",
      message: "Alterações de outros usuários carregadas com sucesso",
      type: "success",
    });
  }, [campaignId]);

  const { onInput } = useTypingIndicator(campaignId);

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO LOCAL
  // ─────────────────────────────────────────────────────────────────────────

  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleAddComment = () => {
    if (!comment.trim()) return;

    recordActivity("comment_added", campaignId, {
      comment: comment.substring(0, 50),
      timestamp: Date.now(),
    });

    setComments([
      ...comments,
      {
        id: Date.now(),
        text: comment,
        timestamp: new Date().toLocaleString(),
      },
    ]);

    setComment("");
    updateUserPresence("active", campaignId);

    addNotification({
      title: "Comentário Adicionado",
      message: "Seu comentário foi registrado com sucesso",
      type: "success",
    });
  };

  const handleSync = async () => {
    recordActivity("manual_sync", campaignId, { timestamp: Date.now() });
    await sync();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CALCULOS
  // ─────────────────────────────────────────────────────────────────────────

  const campaign = campaigns.find((c) => c.id === campaignId);
  const onlineUsersCount = Object.keys(onlineUsers).length;
  const activeUsers = Object.values(onlineUsers).filter(
    (u) => u.status === "active",
  ).length;
  const typingUsers = Object.values(onlineUsers).filter(
    (u) => u.status === "typing",
  ).length;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* HEADER */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className={styles.header}>
        <h1>{campaign?.name || "Campanha"}</h1>

        <div className={styles.statusBar}>
          <div className={styles.statusItem}>
            <span
              className={`${styles.indicator} ${isRealTimeActive ? styles.active : ""}`}
            />
            <span>
              {isRealTimeActive ? "🟢 Realtime Ativo" : "🔴 Realtime Inativo"}
            </span>
          </div>

          <div className={styles.statusItem}>
            <span>{onlineUsersCount} online</span>
          </div>

          <button
            onClick={handleSync}
            className={styles.syncButton}
            disabled={!isRealTimeActive}
          >
            🔄 Sincronizar
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* USUÁRIOS ONLINE */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <Card className={styles.section}>
        <h2>👥 Usuários Online</h2>
        <OnlineUsers campaignId={campaignId} maxDisplay={8} />

        <div className={styles.stats}>
          <div className={styles.stat}>
            <strong>{activeUsers}</strong> ativos
          </div>
          <div className={styles.stat}>
            <strong>{typingUsers}</strong> digitando
          </div>
          <div className={styles.stat}>
            <strong>{onlineUsersCount}</strong> total
          </div>
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* INDICADOR DE DIGITAÇÃO */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      {typingUsers > 0 && (
        <Card className={styles.section}>
          <TypingIndicator campaignId={campaignId} />
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* NOTIFICAÇÕES EM TEMPO REAL */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      {liveNotifications.length > 0 && (
        <Card className={styles.section}>
          <h2>🔔 Notificações em Tempo Real</h2>
          <div className={styles.notificationsLog}>
            {liveNotifications.slice(0, 5).map((notif) => (
              <div key={notif.id} className={styles.notificationItem}>
                <strong>{notif.title}</strong>
                <p>{notif.message}</p>
                <small>{new Date(notif.created_at).toLocaleString()}</small>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* COMENTÁRIOS COM INDICADOR DE DIGITAÇÃO */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <Card className={styles.section}>
        <h2>💬 Comentários & Atividades</h2>

        <div className={styles.commentInput}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onInput={onInput}
            onBlur={() => updateUserPresence("active", campaignId)}
            placeholder="Digite um comentário... (outros usuários verão quando você começar a digitar)"
            className={styles.textarea}
          />

          <button
            onClick={handleAddComment}
            disabled={!comment.trim()}
            className={styles.submitButton}
          >
            Enviar Comentário
          </button>
        </div>

        {/* Log de Comentários */}
        <div className={styles.commentsList}>
          <h3>Histórico</h3>
          {comments.length === 0 ? (
            <p className={styles.empty}>Nenhum comentário ainda...</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className={styles.comment}>
                <p>{comment.text}</p>
                <small>{comment.timestamp}</small>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ATIVIDADES DO USUÁRIO */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <Card className={styles.section}>
        <h2>📊 Atividades Registradas</h2>

        <div className={styles.activityLog}>
          {Object.entries(userActivity).length === 0 ? (
            <p className={styles.empty}>Nenhuma atividade registrada.</p>
          ) : (
            Object.entries(userActivity).map(([userId, activity]) => (
              <div key={userId} className={styles.activityItem}>
                <strong>{activity.type}</strong>
                <small>{new Date(activity.timestamp).toLocaleString()}</small>
                {activity.details && (
                  <pre>{JSON.stringify(activity.details, null, 2)}</pre>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* INSTRUÇÕES */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <Card className={styles.section}>
        <h2>📖 Como Usar</h2>

        <div className={styles.instructions}>
          <h3>✅ Funcionalidades Demonstradas:</h3>
          <ul>
            <li>Mostrar usuários online em tempo real</li>
            <li>Indicador de digitação automático</li>
            <li>Sincronização de dados com outros usuários</li>
            <li>Log de atividades</li>
            <li>Notificações em tempo real</li>
          </ul>

          <h3>🚀 Para Usar em Suas Páginas:</h3>
          <ol>
            <li>
              Importe os hooks necessários:{" "}
              <code>useAppData, useUserPresence, useRealtimeSync</code>
            </li>
            <li>
              Use o componente{" "}
              <code>&lt;OnlineUsers campaignId="..." /&gt;</code>
            </li>
            <li>
              Use o componente{" "}
              <code>&lt;TypingIndicator campaignId="..." /&gt;</code>
            </li>
            <li>
              Use <code>useRealtimeSync</code> para sincronizar dados
              automaticamente
            </li>
            <li>
              Use <code>recordActivity</code> para registrar ações dos usuários
            </li>
          </ol>

          <h3>📚 Documentação:</h3>
          <p>
            Veja <code>REALTIME_SETUP.md</code> para guia completo e exemplos.
          </p>
        </div>
      </Card>
    </div>
  );
}
