import { useEffect } from "react";

/**
 * Hook que mantém o servidor acordado fazendo ping a cada 10 minutos
 * Necessário para plataformas como Render que desligam após inatividade
 * Em desenvolvimento local, apenas ignora erros silenciosamente
 * @param {number} intervalMs - Intervalo em ms (padrão: 10 minutos = 600000ms)
 */
export function useKeepAlive(intervalMs = 600000) {
  useEffect(() => {
    // Detectar se está em desenvolvimento
    const isDev =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    const pingServer = async () => {
      try {
        const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        await fetch(`${appUrl}/api/ping`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        // Log apenas em produção
        if (!isDev) {
          console.log(
            `[Keep-Alive] Ping enviado em ${new Date().toLocaleTimeString("pt-BR")}`,
          );
        }
      } catch (error) {
        // Silenciar erros em desenvolvimento
        if (!isDev) {
          console.warn("[Keep-Alive] Erro ao fazer ping:", error.message);
        }
      }
    };

    // Faz ping imediatamente ao carregar (apenas em produção)
    if (!isDev) {
      pingServer();
    }

    // Configura intervalo repetido (apenas em produção)
    let intervalId;
    if (!isDev) {
      intervalId = setInterval(pingServer, intervalMs);
    }

    // Limpa intervalo ao desmontar
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalMs]);
}
