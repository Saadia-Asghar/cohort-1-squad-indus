import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  hashPassword,
  needsPasswordRehash,
  signToken,
  verifyPassword,
  verifyToken,
} from "./auth.js";

describe("password hashing", () => {
  it("uses a versioned high-work-factor password hash", () => {
    const hash = hashPassword("correct horse battery staple");
    const parts = hash.split("$");

    expect(parts[0]).toBe("pbkdf2");
    expect(parts[1]).toBe("sha512");
    expect(Number(parts[2])).toBeGreaterThanOrEqual(310_000);
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(verifyPassword("wrong password", hash)).toBe(false);
    expect(needsPasswordRehash(hash)).toBe(false);
  });

  it("still verifies older pbkdf2 work factors so login can rehash them", () => {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync("upgrade-me-now", salt, 100_000, 64, "sha512").toString("hex");
    const stored = `pbkdf2$sha512$100000$${salt}$${hash}`;

    expect(verifyPassword("upgrade-me-now", stored)).toBe(true);
    expect(needsPasswordRehash(stored)).toBe(true);
  });

  it("rejects malformed hashes without throwing", () => {
    expect(verifyPassword("anything", "broken")).toBe(false);
    expect(verifyPassword("anything", "pbkdf2$sha512$bad$salt$hash")).toBe(false);
  });
});

describe("legacy migration tokens", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("accepts only HS256 JWT headers", () => {
    const token = signToken({ bakerId: 7 });
    expect(verifyToken(token)?.bakerId).toBe(7);

    const [, payload] = token.split(".");
    const badHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const badSignature = crypto
      .createHmac("sha256", process.env.JWT_SECRET!)
      .update(`${badHeader}.${payload}`)
      .digest("base64url");

    expect(verifyToken(`${badHeader}.${payload}.${badSignature}`)).toBeNull();
  });
});
