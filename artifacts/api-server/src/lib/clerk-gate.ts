/** Native email/password (including public demo bakeries) must not hit Clerk handshake. */
export function shouldMountClerkMiddleware(): boolean {
  if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) return false;
  const mode = (process.env.AUTH_MODE ?? "legacy").trim().toLowerCase();
  return mode === "clerk" || mode === "clerk-only";
}

export function isPublicApiWithoutClerk(path: string): boolean {
  const normalized = path.split("?")[0];
  return (
    normalized === "/api/bakers/login" ||
    normalized === "/api/bakers/register" ||
    normalized === "/api/bakers/forgot-password" ||
    normalized === "/api/bakers/reset-password" ||
    normalized === "/api/admin/login" ||
    normalized === "/api/waitlist" ||
    normalized === "/api/waitlist/count" ||
    normalized === "/api/app-reviews" ||
    normalized === "/api/healthz" ||
    normalized.startsWith("/api/webhooks/")
  );
}
