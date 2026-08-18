import { describe, expect, it } from "vitest";
import { parseSignupFeatureFeedback, SIGNUP_FEATURE_IDS } from "./signup-feature-feedback.js";

describe("parseSignupFeatureFeedback", () => {
  it("keeps only the four homepage workspace features", () => {
    const parsed = parseSignupFeatureFeedback({
      featureIds: ["assistant", "orders", "marketplace", "calendar", "assistant"],
      note: "  WhatsApp chats first  ",
    });
    expect(parsed).toEqual({
      featureIds: ["assistant", "orders", "calendar"],
      note: "WhatsApp chats first",
      skipped: false,
    });
    expect(SIGNUP_FEATURE_IDS).toContain("payments");
  });

  it("accepts a skip with no features selected", () => {
    expect(parseSignupFeatureFeedback({ skipped: true })).toEqual({
      featureIds: [],
      note: null,
      skipped: true,
    });
  });

  it("rejects an empty submission", () => {
    expect(parseSignupFeatureFeedback({})).toBeNull();
    expect(parseSignupFeatureFeedback({ featureIds: ["mall"] })).toBeNull();
  });
});
