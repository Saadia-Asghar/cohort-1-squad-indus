import { describe, expect, it } from "vitest";
import { buildBakerAdminUpdate } from "./admin-baker-update.js";

describe("buildBakerAdminUpdate", () => {
  it("maps baker flags that persist on the bakers row", () => {
    const set = buildBakerAdminUpdate({
      agentActive: false,
      marketplaceVisible: true,
      subscriptionPlan: "starter",
    });
    expect(set).toMatchObject({
      agentActive: false,
      marketplaceVisible: true,
      subscriptionPlan: "starter",
      trialEndsAt: null,
    });
  });

  it("starts a 3-day trial when moving a bakery to free", () => {
    const set = buildBakerAdminUpdate({ subscriptionPlan: "free" });
    expect(set?.subscriptionPlan).toBe("free");
    expect(set?.trialEndsAt).toBeInstanceOf(Date);
  });

  it("rejects an invalid trial timestamp", () => {
    expect(buildBakerAdminUpdate({ trialEndsAt: "not-a-date" })).toBeNull();
  });
});
