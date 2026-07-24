import { describe, expect, it } from "vitest";
import {
  FREE_TRIAL_DAYS,
  freeTrialEndsAtFrom,
  isPlanAccessActive,
  trialStatus,
} from "./subscription.js";

describe("subscription trial", () => {
  it(`gives free bakers ${FREE_TRIAL_DAYS} days`, () => {
    const created = new Date("2026-07-20T00:00:00.000Z");
    const ends = freeTrialEndsAtFrom(created);
    expect(ends.toISOString()).toBe("2026-07-23T00:00:00.000Z");
  });

  it("keeps paid plans active without a trial end", () => {
    expect(
      isPlanAccessActive({
        subscriptionPlan: "starter",
        trialEndsAt: null,
        createdAt: new Date("2020-01-01"),
      }),
    ).toBe(true);
  });

  it("expires free plan after trial end", () => {
    const baker = {
      subscriptionPlan: "free",
      trialEndsAt: new Date("2026-07-20T00:00:00.000Z"),
      createdAt: new Date("2026-07-17T00:00:00.000Z"),
    };
    expect(isPlanAccessActive(baker, new Date("2026-07-21T00:00:00.000Z"))).toBe(false);
    expect(trialStatus(baker, new Date("2026-07-18T00:00:00.000Z")).daysLeft).toBe(2);
  });
});
