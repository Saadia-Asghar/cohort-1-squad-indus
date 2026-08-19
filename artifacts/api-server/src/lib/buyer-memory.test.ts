import { describe, expect, it } from "vitest";
import { buildMemorySummary, extractPreferences, foldSessionPreferences, MEMORY_STUB_SUMMARIES } from "./buyer-memory.js";

describe("extractPreferences", () => {
  it("detects English and Roman Urdu eggless phrasing", () => {
    expect(extractPreferences("anda nahi please", {}).eggless).toBe(true);
    expect(extractPreferences("eggless birthday cake", {}).eggless).toBe(true);
    expect(extractPreferences("no egg cupcakes", {}).eggless).toBe(true);
  });

  it("matches delivery areas from the baker's own list", () => {
    const prefs = extractPreferences("please deliver to gulshan iqbal", {}, ["Gulshan-e-Iqbal", "DHA"]);
    expect(prefs.preferredArea).toBe("Gulshan-e-Iqbal");
  });

  it("keeps a baker-pinned note and pinned eggless flag", () => {
    const prefs = extractPreferences("I want eggs this time", {
      bakerNote: "Always eggless — baker confirmed",
      eggless: true,
      pinEggless: true,
    });
    expect(prefs.bakerNote).toBe("Always eggless — baker confirmed");
    expect(prefs.eggless).toBe(true);
  });

  it("records a spoken area and last cake request", () => {
    const prefs = extractPreferences("I live in Bahria Town and want a chocolate cake", {});
    expect(String(prefs.preferredArea).toLowerCase()).toContain("bahria");
    expect(String(prefs.lastItem).toLowerCase()).toContain("chocolate cake");
  });

  it("uses a catalogue product name when the buyer types it", () => {
    const prefs = extractPreferences("clifton, order their cake Pastel Bento Cake", {}, ["Clifton"], ["Pastel Bento Cake"]);
    expect(prefs.lastItem).toBe("Pastel Bento Cake");
  });

  it("stores WhatsApp and name from chat so a guest can finish without a bag", () => {
    const prefs = foldSessionPreferences(
      [
        "I want Pastel Bento Cake",
        "Clifton",
        "my name is Ali",
        "03001234567",
      ],
      {},
      ["Clifton"],
      ["Pastel Bento Cake"],
    );
    expect(prefs.lastItem).toBe("Pastel Bento Cake");
    expect(prefs.preferredArea).toBe("Clifton");
    expect(prefs.buyerName).toMatch(/Ali/i);
    expect(prefs.buyerWhatsapp).toBe("+923001234567");
  });

  it("picks up I'm-in phrasing and looking-for requests", () => {
    const prefs = extractPreferences("I'm in Clifton and looking for a bento cake", {});
    expect(String(prefs.preferredArea).toLowerCase()).toContain("clifton");
    expect(String(prefs.lastItem).toLowerCase()).toContain("bento cake");
  });

  it("keeps area and last item across later turns in the same session", () => {
    const prefs = foldSessionPreferences(
      [
        "I'm in Clifton and looking for a bento cake",
        "what did I ask for and which area?",
      ],
      {},
      ["Clifton", "Defence"],
    );
    expect(String(prefs.preferredArea).toLowerCase()).toContain("clifton");
    expect(String(prefs.lastItem).toLowerCase()).toContain("bento cake");
  });

  it("records occasion and allergy without copying the full message", () => {
    const prefs = extractPreferences("birthday cake, allergic to nuts", {});
    expect(prefs.occasion).toBe("birthday");
    expect(prefs.allergies).toEqual(["nuts"]);
    expect(JSON.stringify(prefs)).not.toMatch(/birthday cake, allergic/);
  });
});

describe("buildMemorySummary", () => {
  it("does not replace a useful summary with a stub", () => {
    const summary = buildMemorySummary({
      previousSummary: "Eggless. Prefers DHA.",
      preferences: { eggless: true, preferredArea: "DHA" },
      escalated: false,
    });
    expect(summary).toBe("Eggless. Prefers DHA.");
    expect(MEMORY_STUB_SUMMARIES.has(summary)).toBe(false);
  });

  it("builds a short slot summary when the previous text was a stub", () => {
    const summary = buildMemorySummary({
      previousSummary: "Recent menu conversation saved.",
      preferences: { eggless: true, preferredArea: "Clifton", allergies: ["nuts"] },
      escalated: false,
    });
    expect(summary).toContain("Eggless");
    expect(summary).toContain("Clifton");
    expect(summary).toContain("nuts");
  });

  it("keeps baker follow-up without wiping slots", () => {
    const summary = buildMemorySummary({
      previousSummary: "Eggless. Prefers DHA.",
      preferences: { eggless: true, preferredArea: "DHA" },
      escalated: true,
    });
    expect(summary).toMatch(/follow-up/i);
    expect(summary).toContain("Eggless");
  });
});
