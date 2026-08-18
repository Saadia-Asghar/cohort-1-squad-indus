import { describe, expect, it } from "vitest";
import { buildMemorySummary, extractPreferences, MEMORY_STUB_SUMMARIES } from "./buyer-memory.js";

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
