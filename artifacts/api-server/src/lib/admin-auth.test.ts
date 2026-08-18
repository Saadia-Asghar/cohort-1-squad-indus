import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signToken } from "./auth.js";
import {
  authenticateAdmin,
  encryptAdminMetaToken,
  isAdminAuthorization,
  isEnrichDemoAuthorization,
} from "./admin-auth.js";

const JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";

describe("admin authentication", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ENRICH_DEMO_SECRET;
    delete process.env.TOKEN_ENCRYPTION_KEY;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ENRICH_DEMO_SECRET;
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.VERCEL;
  });

  it("refuses login when admin credentials are not configured", () => {
    const result = authenticateAdmin("admin@sweettooth.pk", "SweetTooth@Admin2024");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toMatch(/not configured/i);
    }
  });

  it("refuses login when the password is too short to be a real secret", () => {
    process.env.ADMIN_EMAIL = "ops@example.com";
    process.env.ADMIN_PASSWORD = "short";
    const result = authenticateAdmin("ops@example.com", "short");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("rejects the wrong password without returning JWT_SECRET", () => {
    process.env.ADMIN_EMAIL = "ops@example.com";
    process.env.ADMIN_PASSWORD = "correct-horse-battery-staple";
    const result = authenticateAdmin("ops@example.com", "wrong-password");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(JSON.stringify(result)).not.toContain(JWT_SECRET);
    }
  });

  it("issues a signed admin JWT that is not the signing secret", () => {
    process.env.ADMIN_EMAIL = "ops@example.com";
    process.env.ADMIN_PASSWORD = "correct-horse-battery-staple";
    const result = authenticateAdmin("ops@example.com", "correct-horse-battery-staple");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.token).not.toBe(JWT_SECRET);
    expect(result.token.split(".")).toHaveLength(3);
    expect(isAdminAuthorization(`Bearer ${result.token}`)).toBe(true);
  });

  it("returns 503 instead of crashing when JWT signing is unavailable", () => {
    process.env.ADMIN_EMAIL = "ops@example.com";
    process.env.ADMIN_PASSWORD = "correct-horse-battery-staple";
    process.env.VERCEL = "1";
    delete process.env.JWT_SECRET;
    const result = authenticateAdmin("ops@example.com", "correct-horse-battery-staple");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toMatch(/not configured/i);
    }
  });

  it("does not treat the raw JWT_SECRET as an admin bearer", () => {
    process.env.ADMIN_EMAIL = "ops@example.com";
    process.env.ADMIN_PASSWORD = "correct-horse-battery-staple";
    expect(isAdminAuthorization(`Bearer ${JWT_SECRET}`)).toBe(false);
  });

  it("does not accept a baker JWT as an admin bearer", () => {
    const bakerToken = signToken({ bakerId: 7, role: "owner" });
    expect(isAdminAuthorization(`Bearer ${bakerToken}`)).toBe(false);
  });

  it("does not accept ENRICH_DEMO_SECRET as a general admin bearer", () => {
    process.env.ENRICH_DEMO_SECRET = "enrich-secret-that-is-longer-than-thirty-two";
    expect(isAdminAuthorization("Bearer enrich-secret-that-is-longer-than-thirty-two")).toBe(false);
    expect(isEnrichDemoAuthorization("Bearer enrich-secret-that-is-longer-than-thirty-two")).toBe(true);
    expect(isEnrichDemoAuthorization(`Bearer ${JWT_SECRET}`)).toBe(false);
  });

  it("accepts a valid admin JWT for enrich-demo as well", () => {
    process.env.ADMIN_EMAIL = "ops@example.com";
    process.env.ADMIN_PASSWORD = "correct-horse-battery-staple";
    const result = authenticateAdmin("ops@example.com", "correct-horse-battery-staple");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(isEnrichDemoAuthorization(`Bearer ${result.token}`)).toBe(true);
  });

  it("refuses to store Meta tokens in plaintext when TOKEN_ENCRYPTION_KEY is missing", () => {
    expect(() => encryptAdminMetaToken("EAABmeta-token")).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });
});
