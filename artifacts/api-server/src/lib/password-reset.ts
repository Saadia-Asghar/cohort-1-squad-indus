import crypto from "node:crypto";

export const DEFAULT_PRODUCTION_APP_URL = "https://cohort-1-squad-indus-sweet-tooth.vercel.app";
const RESET_TTL_MS = 60 * 60 * 1000;

export function isLocalDev(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL;
}

export function isMailerConfigured(): boolean {
  const resend = Boolean(process.env.RESEND_API_KEY?.trim());
  const smtp = Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim(),
  );
  return resend || smtp;
}

export function appPublicUrl(): string {
  const fromEnv = process.env.FRONTEND_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_APP_URL;
  }
  return "http://localhost:5180";
}

export function passwordResetUrl(token: string): string {
  return `${appPublicUrl()}/dashboard/reset-password?token=${encodeURIComponent(token)}`;
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetToken(): { token: string; tokenHash: string; expires: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashResetToken(token),
    expires: new Date(Date.now() + RESET_TTL_MS),
  };
}
