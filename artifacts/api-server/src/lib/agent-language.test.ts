import { describe, expect, it } from "vitest";
import { applyAgentLanguage } from "./agent-language.js";

describe("applyAgentLanguage", () => {
  it("does not add an advance/cash footer on a COD policy reply", () => {
    const reply = applyAgentLanguage(
      "Payment policy: Cash on delivery (COD) only. Full payment required at the time of delivery.",
      "bilingual",
      "Fatima's Cakery",
    );
    expect(reply).not.toMatch(/advance ya delivery/i);
    expect(reply).toContain("Payment ki details upar English mein hain.");
  });

  it("does not append a delivery prompt to a welcome that only says help you order", () => {
    const reply = applyAgentLanguage(
      "Welcome to Fatima's Cakery. I'm here to help you order. Would you like to see the menu?",
      "bilingual",
      "Fatima's Cakery",
    );
    expect(reply).toMatch(/menu dekhna/i);
    expect(reply).not.toMatch(/sector\/area/i);
  });
});
