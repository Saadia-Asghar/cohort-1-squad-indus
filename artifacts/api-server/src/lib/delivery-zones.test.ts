import { describe, expect, it } from "vitest";
import { findDeliveryZone, normalizeDeliveryZones } from "./delivery-zones.js";

describe("delivery zone matching", () => {
  const zones = normalizeDeliveryZones([
    { id: "dha", name: "DHA", feePkr: 250, minimumOrderPkr: 1500 },
    { id: "gulberg", name: "Gulberg", feePkr: 180 },
  ]);

  it("uses the area the customer mentions in the current message", () => {
    expect(findDeliveryZone(zones, "Can you deliver to Gulberg today?")?.name).toBe("Gulberg");
  });

  it("does not manufacture a quote for an unconfigured area", () => {
    expect(findDeliveryZone(zones, "Please deliver to Bahria Town")).toBeNull();
  });
});
