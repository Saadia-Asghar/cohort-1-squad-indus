/** Local Vite proxies `/api`. Production must call the API deployment. */
export const API_BASE = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL || ""
  : import.meta.env.VITE_API_URL || "https://cohort-1-squad-indus-api-server-z3b.vercel.app";

export function apiUrl(path: string): string {
  if (!API_BASE) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE.replace(/\/+$/, "")}${normalized}`;
}
