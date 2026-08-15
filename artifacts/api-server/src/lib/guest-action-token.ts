import crypto from "node:crypto";

export type GuestActionScope = "view" | "quote" | "receipt" | "feedback";

type GuestActionPayload = {
  v: 1;
  orderId: number;
  bakerId: number;
  scopes: GuestActionScope[];
  exp: number;
};

function secret(): string {
  const value = process.env.GUEST_ACTION_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("GUEST_ACTION_SECRET or JWT_SECRET must be at least 32 characters.");
  return value;
}

function sign(encodedPayload: string): string {
  return crypto.createHmac("sha256", secret()).update(encodedPayload).digest("base64url");
}

export function createGuestActionToken(input: {
  orderId: number;
  bakerId: number;
  scopes: GuestActionScope[];
  expiresAt: Date;
}): string {
  const payload: GuestActionPayload = {
    v: 1,
    orderId: input.orderId,
    bakerId: input.bakerId,
    scopes: Array.from(new Set(["view" as const, ...input.scopes])),
    exp: Math.floor(input.expiresAt.getTime() / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyGuestActionToken(
  token: string,
  expected: { orderId: number; scope: GuestActionScope; bakerId?: number },
): GuestActionPayload | null {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  const expectedSignature = sign(encoded);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (actualBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as GuestActionPayload;
    if (payload.v !== 1 || !Number.isInteger(payload.orderId) || !Number.isInteger(payload.bakerId)) return null;
    if (!Array.isArray(payload.scopes) || !payload.scopes.includes(expected.scope)) return null;
    if (payload.orderId !== expected.orderId || (expected.bakerId && payload.bakerId !== expected.bakerId)) return null;
    if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function guestOrderUrl(input: {
  orderId: number;
  bakerId: number;
  scopes: GuestActionScope[];
  expiresAt: Date;
  action?: string;
}): string {
  const base = process.env.FRONTEND_URL?.replace(/\/$/, "") || "https://cohort-1-squad-indus-sweet-tooth.vercel.app";
  const token = createGuestActionToken(input);
  const query = new URLSearchParams();
  if (input.action) query.set("action", input.action);
  const path = input.action === "feedback" ? `/feedback/${input.orderId}` : `/orders/${input.orderId}`;
  const search = query.size ? `?${query.toString()}` : "";
  return `${base}${path}${search}#token=${encodeURIComponent(token)}`;
}
