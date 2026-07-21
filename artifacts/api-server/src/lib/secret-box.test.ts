import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./secret-box.js";

describe("secret-box", () => {
  const key = crypto.randomBytes(32).toString("base64");

  it("encrypts Meta tokens with authenticated encryption", () => {
    const encrypted = encryptSecret("EAAB-sensitive-token", key);

    expect(encrypted).not.toContain("EAAB-sensitive-token");
    expect(decryptSecret(encrypted, key)).toBe("EAAB-sensitive-token");
  });

  it("rejects tampered ciphertext and invalid keys", () => {
    const encrypted = encryptSecret("secret", key);
    const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;

    expect(() => decryptSecret(tampered, key)).toThrow();
    expect(() => encryptSecret("secret", "not-base64-32-bytes")).toThrow(/32-byte/);
  });
});
