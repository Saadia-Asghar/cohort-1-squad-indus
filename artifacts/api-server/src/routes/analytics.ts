import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { GetBakerAnalyticsParams, GetOrderSourcesParams } from "@workspace/api-zod";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";
import { buildBakerAnalytics } from "../lib/analytics-engine.js";

const router = Router();

// GET /analytics/baker/:bakerId/:period
router.get("/analytics/baker/:bakerId/:period", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = GetBakerAnalyticsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { bakerId, period } = params.data;
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.bakerId, bakerId));
  res.json(buildBakerAnalytics(orders, period));
});

// GET /analytics/baker/:bakerId/sources
router.get("/analytics/baker/:bakerId/sources", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
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
