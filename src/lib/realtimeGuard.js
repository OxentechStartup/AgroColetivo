const REALTIME_BACKOFF_UNTIL_KEY = "agro_realtime_backoff_until";
const DEFAULT_REALTIME_BACKOFF_MS = 5 * 60 * 1000;

function isRealtimeEnvEnabled() {
  const raw = String(
    import.meta.env?.VITE_ENABLE_SUPABASE_REALTIME ?? "true",
  ).toLowerCase();
  return !["0", "false", "off", "no"].includes(raw);
}

function getRealtimeBackoffUntil() {
  if (typeof localStorage === "undefined") return 0;

  const raw = localStorage.getItem(REALTIME_BACKOFF_UNTIL_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setRealtimeBackoffUntil(timestamp) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(REALTIME_BACKOFF_UNTIL_KEY, String(timestamp));
}

export function isRealtimeAvailable() {
  if (!isRealtimeEnvEnabled()) return false;
  if (typeof window === "undefined") return false;
  if (typeof window.WebSocket === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }

  const backoffUntil = getRealtimeBackoffUntil();
  return !backoffUntil || Date.now() >= backoffUntil;
}

export function markRealtimeFailure(
  source,
  status,
  backoffMs = DEFAULT_REALTIME_BACKOFF_MS,
) {
  const until = Date.now() + backoffMs;
  setRealtimeBackoffUntil(until);

  if (import.meta.env?.DEV) {
    console.warn(
      `[realtime] ${source} paused for ${Math.round(backoffMs / 1000)}s after status: ${status}`,
    );
  }
}

export function clearRealtimeBackoff() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(REALTIME_BACKOFF_UNTIL_KEY);
}

export function cleanupRealtimeChannel(client, channel) {
  if (!channel) return;

  try {
    if (typeof client?.removeChannel === "function") {
      const removal = client.removeChannel(channel);
      if (typeof removal?.catch === "function") {
        removal.catch(() => {});
      }
      return;
    }

    if (typeof channel.unsubscribe === "function") {
      channel.unsubscribe();
    }
  } catch {
    // no-op
  }
}
