import { useEffect } from "react";

/**
 * Hook que mantém o servidor acordado fazendo ping a cada 10 minutos
 * Necessário para plataformas como Render que desligam após inatividade
 * Em desenvolvimento local, este hook é completamente desativado
 * @param {number} intervalMs - Intervalo em ms (padrão: 10 minutos = 600000ms)
 */
export function useKeepAlive(intervalMs = 600000) {
  useEffect(() => {
    // APENAS NO RENDER/PRODUÇÃO - NÃO FAZER NADA EM DEV LOCAL
    // Verificar se é produção (não localhost)
    const isProduction =
      !window.location.hostname.includes("localhost") &&
      window.location.hostname !== "127.0.0.1" &&
      window.location.hostname !== "0.0.0.0";

    // Se não for produção, não fazer nada
    if (!isProduction) {
      return; // Desativa hook completamente em dev
    }

    const pingServer = async () => {
      try {
        // Usar window.location.origin automaticamente (produção) ou localhost (dev)
        const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const pingUrl = `${appUrl}/api/ping`;

        // Debug: mostrar qual URL está sendo usada
        console.debug(`[Keep-Alive] Tentando ping em: ${pingUrl}`);
        const response = await fetch(pingUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          console.log(
            `[Keep-Alive] Ping OK em ${new Date().toLocaleTimeString("pt-BR")}`,
          );
        }
      } catch (error) {
        // Silenciar - falha não é crítica
      }
    };

    // Fazer ping imediatamente
    pingServer();

    // E repetir a cada 10 minutos
    const intervalId = setInterval(pingServer, intervalMs);

    // Limpar ao desmontar
    return () => clearInterval(intervalId);
  }, [intervalMs]);
}
