import { describe, expect, it } from "vitest";
import { buildBakerAnalytics } from "./analytics-engine.js";

describe("buildBakerAnalytics", () => {
  it("computes period-scoped sales, product, price-band, and area insights", () => {
    const now = new Date("2026-07-20T12:00:00Z");
    const result = buildBakerAnalytics(
      [
        order("2026-07-20", 1_500, "DHA", "923001", "Cupcake", 3, 500),
        order("2026-07-19", 3_500, "DHA", "923002", "Chocolate Cake", 1, 3_500),
        order("2026-07-18", 7_000, "Gulberg", "923001", "Wedding Cake", 1, 7_000),
        order("2026-07-17", 9_000, "DHA", "923003", "Cancelled Cake", 1, 9_000, "cancelled"),
        order("2026-07-10", 2_000, "Other", "923004", "Old Cake", 1, 2_000),
      ],
      "daily",
      now,
    );

    expect(result.totalOrders).toBe(3);
    expect(result.totalRevenue).toBe(12_000);
    expect(result.repeatCustomers).toBe(1);
    expect(result.topDeliveryAreas[0]).toEqual({ area: "DHA", orders: 2 });
    expect(result.priceBands).toEqual([
      { name: "Budget (< PKR 2,000)", orders: 1, revenue: 1_500 },
      { name: "Mid-range (PKR 2,000–5,000)", orders: 1, revenue: 3_500 },
      { name: "Premium (> PKR 5,000)", orders: 1, revenue: 7_000 },
    ]);
    expect(result.salesForecast.next7DaysRevenue).toBeGreaterThan(0);
    expect(result.cancellationAnalytics.total).toBe(1);
  });
});

function order(
  date: string,
  totalPkr: number,
  buyerArea: string,
  buyerWhatsapp: string,
  productName: string,
  quantity: number,
  unitPricePkr: number,
  status = "delivered",
) {
  return {
    createdAt: new Date(`${date}T10:00:00Z`),
    totalPkr,
    buyerArea,
    buyerWhatsapp,
    status,
    cancellationReason: status === "cancelled" ? "Customer changed mind" : null,
    cancelledBy: status === "cancelled" ? "customer" : null,
    items: [{ productName, quantity, unitPricePkr }],
  };
}
