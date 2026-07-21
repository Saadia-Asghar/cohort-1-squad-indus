export type AnalyticsPeriod = "daily" | "weekly" | "monthly";

export type AnalyticsOrder = {
  createdAt: Date;
  totalPkr: number;
  buyerArea: string | null;
  buyerWhatsapp: string;
  status: string;
  cancellationReason: string | null;
  cancelledBy: string | null;
  items: unknown;
};

type OrderItem = {
  productName: string;
  quantity: number;
  unitPricePkr: number;
};

function validItems(items: unknown): OrderItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Partial<OrderItem>;
    if (
      typeof item.productName !== "string" ||
      typeof item.quantity !== "number" ||
      typeof item.unitPricePkr !== "number" ||
      item.quantity <= 0 ||
      item.unitPricePkr < 0
    ) {
      return [];
    }
    return [item as OrderItem];
  });
}

function windowDays(period: AnalyticsPeriod): number {
  return period === "daily" ? 7 : period === "weekly" ? 28 : 90;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function buildBakerAnalytics(
  orders: AnalyticsOrder[],
  period: AnalyticsPeriod,
  now = new Date(),
) {
  const days = windowDays(period);
  const today = startOfUtcDay(now);
  const currentStart = new Date(today);
  currentStart.setUTCDate(currentStart.getUTCDate() - (days - 1));
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);

  const inCurrentWindow = orders.filter((order) => order.createdAt >= currentStart);
  const completedOrders = inCurrentWindow.filter((order) => order.status !== "cancelled");
  const previousOrders = orders.filter(
    (order) =>
      order.createdAt >= previousStart &&
      order.createdAt < currentStart &&
      order.status !== "cancelled",
  );

  const dataPoints = Array.from({ length: days }, (_, index) => {
    const date = new Date(currentStart);
    date.setUTCDate(date.getUTCDate() + index);
    const dateString = date.toISOString().slice(0, 10);
    const dateOrders = completedOrders.filter(
      (order) => order.createdAt.toISOString().slice(0, 10) === dateString,
    );
    return {
      date: dateString,
      orders: dateOrders.length,
      revenue: dateOrders.reduce((sum, order) => sum + order.totalPkr, 0),
    };
  });

  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalPkr, 0);
  const totalOrders = completedOrders.length;
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  const productStats = new Map<string, { orders: number; revenue: number }>();
  const previousProductOrders = new Map<string, number>();
  for (const order of completedOrders) {
    for (const item of validItems(order.items)) {
      const current = productStats.get(item.productName) ?? { orders: 0, revenue: 0 };
      current.orders += item.quantity;
      current.revenue += item.quantity * item.unitPricePkr;
      productStats.set(item.productName, current);
    }
  }
  for (const order of previousOrders) {
    for (const item of validItems(order.items)) {
      previousProductOrders.set(
        item.productName,
        (previousProductOrders.get(item.productName) ?? 0) + item.quantity,
      );
    }
  }
  const topProducts = [...productStats.entries()]
    .sort((a, b) => b[1].orders - a[1].orders)
    .slice(0, 5)
    .map(([name, stats]) => ({ name, ...stats }));
  const productTrends = topProducts.map((product) => {
    const previous = previousProductOrders.get(product.name) ?? 0;
    const changePercent =
      previous === 0
        ? product.orders > 0
          ? 100
          : 0
        : Math.round(((product.orders - previous) / previous) * 100);
    return {
      name: product.name,
      currentOrders: product.orders,
      previousOrders: previous,
      changePercent,
    };
  });

  const areaCounts = new Map<string, number>();
  const buyerCounts = new Map<string, number>();
  for (const order of completedOrders) {
    const area = order.buyerArea?.trim();
    if (area) areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
    buyerCounts.set(order.buyerWhatsapp, (buyerCounts.get(order.buyerWhatsapp) ?? 0) + 1);
  }
  const topDeliveryAreas = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([area, count]) => ({ area, orders: count }));

  const priceBands = [
    { name: "Budget (< PKR 2,000)", min: 0, max: 1_999 },
    { name: "Mid-range (PKR 2,000–5,000)", min: 2_000, max: 5_000 },
    { name: "Premium (> PKR 5,000)", min: 5_001, max: Number.POSITIVE_INFINITY },
  ].map((band) => {
    const matching = completedOrders.filter(
      (order) => order.totalPkr >= band.min && order.totalPkr <= band.max,
    );
    return {
      name: band.name,
      orders: matching.length,
      revenue: matching.reduce((sum, order) => sum + order.totalPkr, 0),
    };
  });

  const cancelledOrders = inCurrentWindow.filter((order) => order.status === "cancelled");
  const countBy = (values: string[]) =>
    [...values.reduce((map, value) => {
      map.set(value, (map.get(value) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  const cancellationProducts = cancelledOrders.flatMap((order) =>
    validItems(order.items).flatMap((item) =>
      Array.from({ length: item.quantity }, () => item.productName),
    ),
  );

  const dailyOrderRate = totalOrders / days;
  const dailyRevenueRate = totalRevenue / days;

  return {
    period,
    dataPoints,
    totalOrders,
    totalRevenue,
    avgOrderValue,
    topProducts,
    topDeliveryAreas,
    newCustomers: buyerCounts.size,
    repeatCustomers: [...buyerCounts.values()].filter((count) => count > 1).length,
    priceBands,
    productTrends,
    salesForecast: {
      next7DaysOrders: Math.round(dailyOrderRate * 7),
      next7DaysRevenue: Math.round(dailyRevenueRate * 7),
      confidence: totalOrders >= 30 ? "high" : totalOrders >= 10 ? "medium" : "low",
      method: `${days}-day run-rate estimate`,
    },
    cancellationAnalytics: {
      total: cancelledOrders.length,
      rate: inCurrentWindow.length
        ? Math.round((cancelledOrders.length / inCurrentWindow.length) * 100)
        : 0,
      byReason: countBy(
        cancelledOrders.map((order) => order.cancellationReason || "Not specified"),
      ),
      byProduct: countBy(cancellationProducts),
      byActor: countBy(
        cancelledOrders.map((order) => order.cancelledBy || "baker"),
      ),
    },
  };
}
