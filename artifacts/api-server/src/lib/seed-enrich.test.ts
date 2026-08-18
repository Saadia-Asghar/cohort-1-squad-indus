import { describe, expect, it } from "vitest";
import { DEMO_BAKER_PROFILES, DEMO_PASSWORDS, DEMO_SLUGS } from "./demo-bakers.js";

describe("demo baker catalog", () => {
  it("covers every demo slug with a unique email, phone, and starter menu", () => {
    const emails = new Set<string>();
    const phones = new Set<string>();

    for (const slug of DEMO_SLUGS) {
      const password = DEMO_PASSWORDS[slug];
      const profile = DEMO_BAKER_PROFILES[slug];
      expect(password.length).toBeGreaterThanOrEqual(12);
      expect(profile.email).toMatch(/@/);
      expect(profile.whatsappNumber.startsWith("+92")).toBe(true);
      expect(profile.products.length).toBeGreaterThanOrEqual(2);
      expect(profile.deliveryAreas.length).toBeGreaterThan(0);
      expect(emails.has(profile.email)).toBe(false);
      expect(phones.has(profile.whatsappNumber)).toBe(false);
      emails.add(profile.email);
      phones.add(profile.whatsappNumber);
    }
  });
});
