import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { GetBakerAnalyticsParams, GetOrderSourcesParams } from "@workspace/api-zod";

const router = Router();

// GET /analytics/baker/:bakerId/:period
router.get("/analytics/baker/:bakerId/:period", async (req, res): Promise<void> => {
  const params = GetBakerAnalyticsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { bakerId, period } = params.data;
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.bakerId, bakerId));

  // Build data points by date
  const now = new Date();
  const days = period === "daily" ? 7 : period === "weekly" ? 28 : 90;
  const dataPoints: Array<{ date: string; orders: number; revenue: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter((o) => o.createdAt.toISOString().slice(0, 10) === dateStr);
    dataPoints.push({ date: dateStr, orders: dayOrders.length, revenue: dayOrders.reduce((s, o) => s + o.totalPkr, 0) });
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + o.totalPkr, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Top products
  const productCount: Record<string, { orders: number; revenue: number }> = {};
  for (const o of orders) {
    const items = (o.items as Array<{ productName: string; quantity: number; unitPricePkr: number }>) ?? [];
    for (const item of items) {
      if (!productCount[item.productName]) productCount[item.productName] = { orders: 0, revenue: 0 };
      productCount[item.productName].orders += item.quantity;
      productCount[item.productName].revenue += item.quantity * item.unitPricePkr;
    }
  }
  const topProducts = Object.entries(productCount)
    .sort((a, b) => b[1].orders - a[1].orders)
    .slice(0, 5)
    .map(([name, stats]) => ({ name, ...stats }));

  // Unique buyers
  const buyerSet = new Set(orders.map((o) => o.buyerWhatsapp));
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newBuyers = new Set(orders.filter((o) => o.createdAt >= monthAgo).map((o) => o.buyerWhatsapp));
  const repeatBuyers = orders
    .filter((o) => {
      const count = orders.filter((x) => x.buyerWhatsapp === o.buyerWhatsapp).length;
      return count > 1;
    });
  const repeatSet = new Set(repeatBuyers.map((o) => o.buyerWhatsapp));

  res.json({
    period,
    dataPoints,
    totalOrders,
    totalRevenue,
    avgOrderValue,
    topProducts,
    newCustomers: newBuyers.size,
    repeatCustomers: repeatSet.size,
  });
});

// GET /analytics/baker/:bakerId/sources
router.get("/analytics/baker/:bakerId/sources", async (req, res): Promise<void> => {
  const params = GetOrderSourcesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.bakerId, params.data.bakerId));
  const sourceCounts: Record<string, { orders: number; revenue: number }> = {};
  for (const o of orders) {
    if (!sourceCounts[o.source]) sourceCounts[o.source] = { orders: 0, revenue: 0 };
    sourceCounts[o.source].orders++;
    sourceCounts[o.source].revenue += o.totalPkr;
  }
  const total = orders.length;
  const sources = Object.entries(sourceCounts).map(([source, stats]) => ({
    source,
    orders: stats.orders,
    revenue: stats.revenue,
    percentage: total > 0 ? Math.round((stats.orders / total) * 100) : 0,
  }));
  res.json(sources);
});

export default router;
