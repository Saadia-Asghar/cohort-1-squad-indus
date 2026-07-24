import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildUpgradeWhatsAppUrl,
  getPlatformBillingConfig,
  platformWhatsAppDigits,
} from "./platform-billing.js";

describe("platform-billing", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    delete process.env.PLATFORM_WHATSAPP;
    delete process.env.PLATFORM_PAYMENT_DETAILS;
    delete process.env.PLATFORM_BILLING_NAME;
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("normalizes local PK numbers for wa.me", () => {
    expect(platformWhatsAppDigits("03001234567")).toBe("923001234567");
    expect(platformWhatsAppDigits("+92 300 1234567")).toBe("923001234567");
  });

  it("builds upgrade deep link when PLATFORM_WHATSAPP is set", () => {
    process.env.PLATFORM_WHATSAPP = "03001234567";
    process.env.PLATFORM_BILLING_NAME = "Indus";
    const url = buildUpgradeWhatsAppUrl({
      planId: "starter",
      planName: "Kitchen Standard",
      amountLabel: "PKR 1,799/mo",
      bakerId: 3,
      businessName: "Amna Bakes",
      ownerName: "Indus",
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/923001234567\?text=/);
    expect(decodeURIComponent(url!.split("text=")[1]!)).toContain("Amna Bakes");
    expect(decodeURIComponent(url!.split("text=")[1]!)).toContain("starter");
  });

  it("reports enabled when WhatsApp is configured", () => {
    process.env.PLATFORM_WHATSAPP = "923001234567";
    process.env.PLATFORM_PAYMENT_DETAILS = "JazzCash 0300";
    const cfg = getPlatformBillingConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.paymentDetails).toContain("JazzCash");
  });
});
