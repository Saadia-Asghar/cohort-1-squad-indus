import crypto from "node:crypto";
import { signToken, verifyToken } from "./auth.js";
import { encryptSecret } from "./secret-box.js";

const MIN_ADMIN_PASSWORD_LENGTH = 12;
const MIN_ENRICH_SECRET_LENGTH = 16;

export type AdminAuthResult =
  | { ok: true; token: string }
  | { ok: false; status: 400 | 401 | 503; error: string };

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  const max = Math.max(aBuf.length, bBuf.length, 1);
  const aPad = Buffer.alloc(max);
  const bPad = Buffer.alloc(max);
  aBuf.copy(aPad);
  bBuf.copy(bPad);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aPad, bPad);
}

function getConfiguredAdmin(): { email: string; password: string } | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || password.length < MIN_ADMIN_PASSWORD_LENGTH) return null;
  return { email, password };
}

function bearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export function authenticateAdmin(
  email: string | undefined,
  password: string | undefined,
): AdminAuthResult {
  const configured = getConfiguredAdmin();
  if (!configured) {
    return { ok: false, status: 503, error: "Admin login is not configured." };
  }
  if (!email?.trim() || password == null || password === "") {
    return { ok: false, status: 400, error: "Email and password are required." };
  }

  const emailOk = timingSafeEqualString(email.trim().toLowerCase(), configured.email);
  const passwordOk = timingSafeEqualString(password, configured.password);
  if (!emailOk || !passwordOk) {
    return { ok: false, status: 401, error: "Invalid email or password." };
  }

  try {
    return {
      ok: true,
      token: signToken({ role: "admin", admin: true, email: configured.email }),
    };
  } catch (error) {
    console.error("admin JWT signing failed", error);
    return { ok: false, status: 503, error: "Admin login is not configured." };
  }
}

export function isAdminAuthorization(authorization: string | undefined): boolean {
  const token = bearerToken(authorization);
  if (!token) return false;
  const decoded = verifyToken(token);
  return Boolean(
    decoded &&
      decoded.admin === true &&
      decoded.role === "admin" &&
      typeof decoded.bakerId !== "number",
  );
}

export function isEnrichDemoAuthorization(authorization: string | undefined): boolean {
  if (isAdminAuthorization(authorization)) return true;
  const token = bearerToken(authorization);
  const enrich = process.env.ENRICH_DEMO_SECRET?.trim();
  if (!token || !enrich || enrich.length < MIN_ENRICH_SECRET_LENGTH) return false;
  return timingSafeEqualString(token, enrich);
}

export function encryptAdminMetaToken(plaintext: string): string {
  const key = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required to store Meta tokens.");
  }
  return encryptSecret(plaintext, key);
}
