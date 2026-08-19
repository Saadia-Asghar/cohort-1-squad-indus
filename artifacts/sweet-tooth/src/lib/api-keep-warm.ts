import { apiUrl } from "@/lib/api-url";

const KEEP_WARM_MS = 4 * 60 * 1000;

/** Ping the API so Vercel/Neon free-tier sleep is less likely while this tab is open. */
export function startApiKeepWarm(): void {
  if (typeof window === "undefined") return;
  const ping = () => {
    void fetch(apiUrl("/api/healthz"), { cache: "no-store", method: "GET" }).catch(() => undefined);
  };
  ping();
  window.setInterval(() => {
    if (document.visibilityState === "visible") ping();
  }, KEEP_WARM_MS);
}
