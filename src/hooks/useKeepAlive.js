import { useEffect } from "react";

/**
 * Hook que mantém o servidor acordado fazendo ping a cada 10 minutos
 * Necessário para plataformas como Render que desligam após inatividade
 * @param {number} intervalMs - Intervalo em ms (padrão: 10 minutos = 600000ms)
 */
export function useKeepAlive(intervalMs = 600000) {
  useEffect(() => {
    const pingServer = async () => {
      try {
        const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        await fetch(`${appUrl}/api/ping`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        console.log(
          `[Keep-Alive] Ping enviado em ${new Date().toLocaleTimeString("pt-BR")}`,
        );
      } catch (error) {
        console.warn("[Keep-Alive] Erro ao fazer ping:", error.message);
        // Não faz nada - apenas logging
      }
    };

    // Faz ping imediatamente ao carregar
    pingServer();

    // Configura intervalo repetido
    const intervalId = setInterval(pingServer, intervalMs);

    // Limpa intervalo ao desmontar
    return () => clearInterval(intervalId);
  }, [intervalMs]);
}
