import { describe, expect, it } from "vitest";
import { resourceLimitsForPlan } from "./plan-limits.js";

describe("plan resource limits", () => {
  it("matches marketing quotas for free and paid plans", () => {
    expect(resourceLimitsForPlan("free")).toEqual({
      aiRepliesPerMonth: 50,
      maxOrdersPerMonth: 20,
      maxProducts: 8,
      staffLogins: 1,
    });
    expect(resourceLimitsForPlan("starter").maxProducts).toBe(25);
    expect(resourceLimitsForPlan("pro").maxProducts).toBeNull();
    expect(resourceLimitsForPlan("bakery_plus").aiRepliesPerMonth).toBe(1500);
    expect(resourceLimitsForPlan("bakery_plus").staffLogins).toBe(2);
  });

  it("falls back to free for unknown plans", () => {
    expect(resourceLimitsForPlan("unknown")).toEqual(resourceLimitsForPlan("free"));
  });
});
