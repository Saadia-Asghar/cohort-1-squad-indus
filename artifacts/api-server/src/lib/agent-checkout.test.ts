import { describe, expect, it } from "vitest";
import {
  applyFollowUpAnswer,
  checkoutRecap,
  createOrderCommandBlock,
  isCheckoutRecap,
  missingCheckoutSlot,
  parseNeededByDate,
  slotsFromPreferences,
} from "./agent-checkout.js";

describe("agent checkout without a bag", () => {
  it("asks for area, then name, then WhatsApp", () => {
    expect(missingCheckoutSlot({ quantity: 1, pickup: false, productName: "Pastel Bento Cake" })).toBe("area");
    expect(missingCheckoutSlot({
      quantity: 1,
      pickup: false,
      productName: "Pastel Bento Cake",
      area: "Clifton",
    })).toBe("name");
    expect(missingCheckoutSlot({
      quantity: 1,
      pickup: false,
      productName: "Pastel Bento Cake",
      area: "Clifton",
      buyerName: "Ali",
    })).toBe("whatsapp");
    expect(missingCheckoutSlot({
      quantity: 1,
      pickup: false,
      productName: "Pastel Bento Cake",
      area: "Clifton",
      buyerName: "Ali",
      buyerWhatsapp: "+923001234567",
    })).toBeNull();
  });

  it("treats a short name as the answer after the assistant asked", () => {
    const prefs = applyFollowUpAnswer("Ali Khan", "What name should the bakery put on the order?", {});
    expect(prefs.buyerName).toBe("Ali Khan");
  });

  it("parses a local date and builds a confirm recap the baker will receive", () => {
    expect(parseNeededByDate("need it 22/08/2026")).toBe("2026-08-22");
    const recap = checkoutRecap({
      bakerName: "Fatima's Cakery",
      productName: "Pastel Bento Cake",
      priceLine: "PKR 1,850",
      slots: {
        quantity: 1,
        pickup: false,
        area: "Clifton",
        buyerName: "Ali",
        buyerWhatsapp: "+923001234567",
        neededByDate: "2026-08-22",
      },
    });
    expect(isCheckoutRecap(recap)).toBe(true);
    expect(recap).toContain("Clifton");
    expect(createOrderCommandBlock({
      productName: "Pastel Bento Cake",
      slots: slotsFromPreferences({
        lastItem: "Pastel Bento Cake",
        preferredArea: "Clifton",
        buyerName: "Ali",
        buyerWhatsapp: "+923001234567",
        neededByDate: "2026-08-22",
      }),
    })).toContain("CREATE_ORDER");
  });
});
