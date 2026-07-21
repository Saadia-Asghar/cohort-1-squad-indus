export type CustomerOrderForInsights = {
  totalPkr: number;
  buyerArea: string | null;
  status: string;
  createdAt: Date;
  items: unknown;
};

export type CustomerInsights = {
  favoriteProducts?: string[];
  preferredArea?: string;
  averageOrderValuePkr?: number;
  priceBand?: "budget" | "mid-range" | "premium";
  minOrderValuePkr?: number;
  maxOrderValuePkr?: number;
  orderCount?: number;
  lastOrderAt?: string;
};

export function deriveCustomerInsights(
  orders: CustomerOrderForInsights[],
): CustomerInsights {
  const validOrders = orders.filter(
    (order) =>
      order.status !== "cancelled" &&
      Number.isFinite(order.totalPkr) &&
      order.totalPkr > 0,
  );
  if (validOrders.length === 0) return {};

  const productQuantities = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  for (const order of validOrders) {
    const area = order.buyerArea?.trim();
    if (area) areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);

    if (!Array.isArray(order.items)) continue;
    for (const value of order.items) {
      if (!value || typeof value !== "object") continue;
      const item = value as { productName?: unknown; quantity?: unknown };
      if (typeof item.productName !== "string" || !item.productName.trim()) continue;
      const quantity =
        typeof item.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;
      const name = item.productName.trim();
      productQuantities.set(name, (productQuantities.get(name) ?? 0) + quantity);
    }
  }

  const values = validOrders.map((order) => order.totalPkr);
  const averageOrderValuePkr = Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
  const priceBand =
    averageOrderValuePkr < 2_000
      ? "budget"
      : averageOrderValuePkr <= 5_000
        ? "mid-range"
        : "premium";
  const favoriteProducts = [...productQuantities.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([name]) => name);
  const preferredArea = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  const lastOrderAt = validOrders
    .map((order) => order.createdAt)
    .sort((a, b) => b.getTime() - a.getTime())[0]
    .toISOString();

  return {
    ...(favoriteProducts.length ? { favoriteProducts } : {}),
    ...(preferredArea ? { preferredArea } : {}),
    averageOrderValuePkr,
    priceBand,
    minOrderValuePkr: Math.min(...values),
    maxOrderValuePkr: Math.max(...values),
    orderCount: validOrders.length,
    lastOrderAt,
  };
}
