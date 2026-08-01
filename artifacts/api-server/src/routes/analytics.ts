import { Router } from "express";
import { eq, and, gte, sql } from "drizzle-orm";
import { db, ordersTable, chatMessagesTable, orderAuditLogsTable } from "@workspace/db";
import { GetBakerAnalyticsParams, GetOrderSourcesParams, GetWeeklySuccessReportParams } from "@workspace/api-zod";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";
import { buildBakerAnalytics } from "../lib/analytics-engine.js";
import { buildFeedbackAnalytics } from "../lib/order-feedback.js";

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

// GET /analytics/baker/:bakerId/feedback
router.get("/analytics/baker/:bakerId/feedback", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const bakerId = parseInt(String(req.params.bakerId), 10);
  if (isNaN(bakerId)) {
    res.status(400).json({ error: "Invalid baker ID" });
    return;
  }
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.bakerId, bakerId));
  res.json(buildFeedbackAnalytics(orders));
});

// GET /analytics/baker/:bakerId/weekly-report
router.get("/analytics/baker/:bakerId/weekly-report", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = GetWeeklySuccessReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const bakerId = params.data.bakerId;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // 1. Total Orders & Trend
  const currentOrders = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.bakerId, bakerId),
      gte(ordersTable.createdAt, sevenDaysAgo)
    )
  );

  const prevOrders = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.bakerId, bakerId),
      gte(ordersTable.createdAt, fourteenDaysAgo),
      sql`${ordersTable.createdAt} < ${sevenDaysAgo}`
    )
  );

  const ordersCount = currentOrders.length;
  const prevCount = prevOrders.length;
  const ordersTrendPercent = prevCount > 0
    ? Math.round(((ordersCount - prevCount) / prevCount) * 100)
    : ordersCount > 0 ? 100 : 0;

  // 2. Repeat Buyers
  const phoneCounts = new Map<string, number>();
  for (const o of currentOrders) {
    const phone = o.buyerWhatsapp;
    phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
  }
  let repeatBuyersCount = 0;
  for (const count of phoneCounts.values()) {
    if (count > 1) repeatBuyersCount++;
  }

  // 3. AI Assistant Response Time
  const messages = await db.select().from(chatMessagesTable).where(
    and(
      eq(chatMessagesTable.bakerId, bakerId),
      gte(chatMessagesTable.createdAt, sevenDaysAgo)
    )
  ).orderBy(chatMessagesTable.sessionId, chatMessagesTable.createdAt);

  const sessionGroups: Record<string, typeof messages> = {};
  for (const m of messages) {
    if (!sessionGroups[m.sessionId]) {
      sessionGroups[m.sessionId] = [];
    }
    sessionGroups[m.sessionId].push(m);
  }

  let totalPairs = 0;
  let totalDiffMs = 0;
  for (const msgs of Object.values(sessionGroups)) {
    for (let i = 0; i < msgs.length - 1; i++) {
      if (msgs[i].role === "user" && msgs[i + 1].role === "assistant") {
        const diff = msgs[i + 1].createdAt.getTime() - msgs[i].createdAt.getTime();
        // Cap at 1 hour (3600000 ms) so that overnight messages don't break response stats
        if (diff > 0 && diff < 3600000) {
          totalDiffMs += diff;
          totalPairs++;
        }
      }
    }
  }
  const avgResponseTimeSec = totalPairs > 0 ? Math.round((totalDiffMs / totalPairs) / 1000) : 0;

  // 4. Failed Payment Reviews
  const auditLogs = await db.select().from(orderAuditLogsTable).where(
    and(
      eq(orderAuditLogsTable.bakerId, bakerId),
      eq(orderAuditLogsTable.action, "ocr_verification"),
      gte(orderAuditLogsTable.createdAt, sevenDaysAgo)
    )
  );
  let failedPaymentReviewsCount = 0;
  for (const log of auditLogs) {
    const metadata = log.metadata as Record<string, any> | null;
    if (metadata && metadata.verified === false) {
      failedPaymentReviewsCount++;
    }
  }

  res.json({
    ordersCount,
    ordersTrendPercent,
    repeatBuyersCount,
    avgResponseTimeSec,
    failedPaymentReviewsCount,
  });
});

export default router;
