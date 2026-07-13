const API_URL = import.meta.env.VITE_API_URL || "https://cohort-1-squad-indus-api-server-z3b.vercel.app";
const STORAGE_KEY = "sweet-tooth-baker-session";

export type BakerSession = {
  token: string;
  bakerId: number;
  email: string;
};

type BakerAuthResponse = { token: string; baker: { id: number; email: string | null } };

function saveSession(response: BakerAuthResponse): BakerSession {
  const session = { token: response.token, bakerId: response.baker.id, email: response.baker.email ?? "" };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem("bakerId", String(session.bakerId));
  return session;
}

export function getBakerSession(): BakerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BakerSession;
    return parsed.token && Number.isInteger(parsed.bakerId) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearBakerSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("bakerId");
}

async function request(path: string, body: Record<string, string>): Promise<BakerSession> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json() as BakerAuthResponse & { error?: string };
  if (!response.ok) throw new Error(data.error || "We could not sign you in.");
  return saveSession(data);
}

export function loginBaker(identifier: string, password: string) {
  return request("/api/bakers/login", { identifier, password });
}

export function registerBaker(input: {
  businessName: string; ownerName: string; city: string; whatsappNumber: string; email: string; password: string;
}) {
  const slugBase = input.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "bakery";
  return request("/api/bakers", { ...input, slug: `${slugBase}-${Date.now().toString(36)}` });
}
