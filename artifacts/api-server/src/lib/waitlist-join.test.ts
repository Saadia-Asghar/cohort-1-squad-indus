import { describe, expect, it } from "vitest";
import { normalizeWaitlistSource, waitlistDisplayLabel } from "./waitlist-join.js";

describe("normalizeWaitlistSource", () => {
  it("keeps launch signups on the public waitlist", () => {
    expect(normalizeWaitlistSource("launch")).toBe("launch");
  });

  it("defaults dashboard and unknown sources to WhatsApp agent", () => {
    expect(normalizeWaitlistSource("whatsapp")).toBe("whatsapp");
    expect(normalizeWaitlistSource(undefined)).toBe("whatsapp");
    expect(normalizeWaitlistSource("other")).toBe("whatsapp");
  });
});

describe("waitlistDisplayLabel", () => {
  it("labels launch versus WhatsApp agent rows", () => {
    expect(waitlistDisplayLabel("launch")).toBe("Launch waitlist");
    expect(waitlistDisplayLabel("whatsapp")).toBe("WhatsApp agent");
  });
});
