import { describe, expect, it } from "vitest";
import { deriveCustomerInsights } from "./customer-insights.js";

describe("deriveCustomerInsights", () => {
  it("derives favorites, price behavior, and area from completed order history", () => {
    const insights = deriveCustomerInsights([
      {
        totalPkr: 3_000,
        buyerArea: "DHA",
        status: "delivered",
        createdAt: new Date("2026-07-01"),
        items: [{ productName: "Chocolate Cake", quantity: 2, unitPricePkr: 1_500 }],
      },
      {
        totalPkr: 4_000,
        buyerArea: "DHA",
        status: "confirmed",
        createdAt: new Date("2026-07-15"),
        items: [
          { productName: "Chocolate Cake", quantity: 1, unitPricePkr: 3_000 },
          { productName: "Brownie", quantity: 1, unitPricePkr: 1_000 },
        ],
      },
      {
        totalPkr: 99_999,
        buyerArea: "Other",
        status: "cancelled",
        createdAt: new Date("2026-07-18"),
        items: [{ productName: "Cancelled Item", quantity: 1, unitPricePkr: 99_999 }],
      },
    ]);

    expect(insights.favoriteProducts).toEqual(["Chocolate Cake", "Brownie"]);
    expect(insights.preferredArea).toBe("DHA");
    expect(insights.averageOrderValuePkr).toBe(3_500);
    expect(insights.priceBand).toBe("mid-range");
    expect(insights.orderCount).toBe(2);
  });

  it("returns no inferred preferences without valid order history", () => {
    expect(deriveCustomerInsights([])).toEqual({});
  });
});
