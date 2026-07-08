import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, bakersTable, productsTable, reviewsTable, ordersTable } from "@workspace/db";
import {
  GetBakerParams,
  GetBakerProductsParams,
  GetBakerReviewsParams,
  GetBakerStatsParams,
  UpdateBakerParams,
  UpdateBakerBody,
  CreateBakerBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /bakers
router.get("/bakers", async (req, res): Promise<void> => {
  const { city, area } = req.query as Record<string, string>;
  let query = db.select().from(bakersTable).$dynamic();
  if (city) query = query.where(eq(bakersTable.city, city));
  const bakers = await query;
  const bakerCards = await Promise.all(
    bakers.map(async (b) => {
      const products = await db.select({ category: productsTable.category, basePricePkr: productsTable.basePricePkr })
        .from(productsTable).where(eq(productsTable.bakerId, b.id));
      const categories = [...new Set(products.map((p) => p.category))];
      const startingPrice = products.length > 0 ? Math.min(...products.map((p) => p.basePricePkr)) : null;
      return { ...b, deliveryAreas: b.deliveryAreas ?? [], categories, startingPrice };
    })
  );
  res.json(bakerCards);
});

// POST /bakers
router.post("/bakers", async (req, res): Promise<void> => {
  const parsed = CreateBakerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [baker] = await db.insert(bakersTable).values(parsed.data).returning();
  res.status(201).json({ ...baker, deliveryAreas: baker.deliveryAreas ?? [] });
});

// GET /bakers/:bakerId
router.get("/bakers/:bakerId", async (req, res): Promise<void> => {
  const params = GetBakerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, params.data.bakerId));
  if (!baker) {
    res.status(404).json({ error: "Baker not found" });
    return;
  }
  res.json({ ...baker, deliveryAreas: baker.deliveryAreas ?? [] });
});

// PATCH /bakers/:bakerId
router.patch("/bakers/:bakerId", async (req, res): Promise<void> => {
  const params = UpdateBakerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBakerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [baker] = await db.update(bakersTable).set(parsed.data).where(eq(bakersTable.id, params.data.bakerId)).returning();
  if (!baker) {
    res.status(404).json({ error: "Baker not found" });
    return;
  }
  res.json({ ...baker, deliveryAreas: baker.deliveryAreas ?? [] });
});

// GET /bakers/:bakerId/products
router.get("/bakers/:bakerId/products", async (req, res): Promise<void> => {
  const params = GetBakerProductsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const products = await db.select().from(productsTable)
    .where(eq(productsTable.bakerId, params.data.bakerId))
    .orderBy(productsTable.displayOrder, productsTable.createdAt);
  res.json(products.map((p) => ({
    ...p,
    sizes: (p.sizes as unknown[]) ?? [],
    variants: p.variants ?? [],
    occasionTags: p.occasionTags ?? [],
    dietaryTags: p.dietaryTags ?? [],
  })));
});

// GET /bakers/:bakerId/reviews
router.get("/bakers/:bakerId/reviews", async (req, res): Promise<void> => {
  const params = GetBakerReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const reviews = await db.select().from(reviewsTable)
    .where(eq(reviewsTable.bakerId, params.data.bakerId))
    .orderBy(sql`${reviewsTable.createdAt} DESC`);
  res.json(reviews);
});

// GET /bakers/:bakerId/stats
router.get("/bakers/:bakerId/stats", async (req, res): Promise<void> => {
  const params = GetBakerStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const bakerId = params.data.bakerId;
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!baker) {
    res.status(404).json({ error: "Baker not found" });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const allOrders = await db.select().from(ordersTable).where(eq(ordersTable.bakerId, bakerId));
  const todayOrders = allOrders.filter((o) => o.createdAt.toISOString().slice(0, 10) === today);
  const todayRevenue = todayOrders.reduce((s, o) => s + o.totalPkr, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekOrders = allOrders.filter((o) => o.createdAt >= weekAgo);
  const weekRevenue = weekOrders.reduce((s, o) => s + o.totalPkr, 0);
  const totalRevenue = allOrders.reduce((s, o) => s + o.totalPkr, 0);
  const pendingOrders = allOrders.filter((o) => ["new", "confirmed", "in_production"].includes(o.status)).length;
  const outstandingPayments = allOrders
    .filter((o) => o.status === "delivered" && o.paymentStatus === "pending")
    .reduce((s, o) => s + o.totalPkr, 0);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newCustomersThisMonth = new Set(
    allOrders.filter((o) => o.createdAt >= monthAgo).map((o) => o.buyerWhatsapp)
  ).size;
  // Top product from items
  const productCount: Record<string, number> = {};
  for (const o of allOrders) {
    const items = (o.items as Array<{ productName: string }>) ?? [];
    for (const item of items) {
      productCount[item.productName] = (productCount[item.productName] ?? 0) + 1;
    }
  }
  const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  res.json({
    bakerId,
    todayOrders: todayOrders.length,
    todayRevenue,
    weekOrders: weekOrders.length,
    weekRevenue,
    totalOrders: allOrders.length,
    totalRevenue,
    pendingOrders,
    outstandingPayments,
    agentActive: baker.agentActive,
    topProduct,
    newCustomersThisMonth,
  });
});

// GET /bakers/:bakerId/agent-config
router.get("/bakers/:bakerId/agent-config", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId);
  if (isNaN(bakerId)) { res.status(400).json({ error: "Invalid bakerId" }); return; }
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!baker) { res.status(404).json({ error: "Baker not found" }); return; }
  const conf = (baker.agentConfig ?? {}) as Record<string, unknown>;
  res.json({
    bakerId: baker.id,
    agentActive: baker.agentActive,
    whatsappAgentEnabled: baker.whatsappAgentEnabled,
    instagramAgentEnabled: baker.instagramAgentEnabled,
    metaWebhookToken: baker.metaWebhookToken,
    instagramPageId: baker.instagramPageId,
    customGreeting: (conf.customGreeting as string | null) ?? null,
    blockedTopics: (conf.blockedTopics as string[]) ?? [],
    escalateKeywords: (conf.escalateKeywords as string[]) ?? [],
    autoReplyEnabled: (conf.autoReplyEnabled as boolean) ?? true,
  });
});

// PUT /bakers/:bakerId/agent-config
router.put("/bakers/:bakerId/agent-config", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId);
  if (isNaN(bakerId)) { res.status(400).json({ error: "Invalid bakerId" }); return; }
  const body = req.body as {
    agentActive?: boolean;
    whatsappAgentEnabled?: boolean;
    instagramAgentEnabled?: boolean;
    metaWebhookToken?: string;
    instagramPageId?: string;
    customGreeting?: string;
    blockedTopics?: string[];
    escalateKeywords?: string[];
    autoReplyEnabled?: boolean;
    customResponses?: Array<{ trigger: string; response: string }>;
  };
  const agentConfigUpdate: Record<string, unknown> = {};
  if (body.customGreeting !== undefined) agentConfigUpdate.customGreeting = body.customGreeting;
  if (body.blockedTopics !== undefined) agentConfigUpdate.blockedTopics = body.blockedTopics;
  if (body.escalateKeywords !== undefined) agentConfigUpdate.escalateKeywords = body.escalateKeywords;
  if (body.autoReplyEnabled !== undefined) agentConfigUpdate.autoReplyEnabled = body.autoReplyEnabled;
  if (body.customResponses !== undefined) agentConfigUpdate.customResponses = body.customResponses;

  const update: Record<string, unknown> = { agentConfig: agentConfigUpdate };
  if (body.agentActive !== undefined) update.agentActive = body.agentActive;
  if (body.whatsappAgentEnabled !== undefined) update.whatsappAgentEnabled = body.whatsappAgentEnabled;
  if (body.instagramAgentEnabled !== undefined) update.instagramAgentEnabled = body.instagramAgentEnabled;
  if (body.metaWebhookToken !== undefined) update.metaWebhookToken = body.metaWebhookToken;
  if (body.instagramPageId !== undefined) update.instagramPageId = body.instagramPageId;

  const [baker] = await db.update(bakersTable).set(update).where(eq(bakersTable.id, bakerId)).returning();
  if (!baker) { res.status(404).json({ error: "Baker not found" }); return; }
  const conf = (baker.agentConfig ?? {}) as Record<string, unknown>;
  res.json({
    bakerId: baker.id,
    agentActive: baker.agentActive,
    whatsappAgentEnabled: baker.whatsappAgentEnabled,
    instagramAgentEnabled: baker.instagramAgentEnabled,
    metaWebhookToken: baker.metaWebhookToken,
    instagramPageId: baker.instagramPageId,
    customGreeting: (conf.customGreeting as string | null) ?? null,
    blockedTopics: (conf.blockedTopics as string[]) ?? [],
    escalateKeywords: (conf.escalateKeywords as string[]) ?? [],
    autoReplyEnabled: (conf.autoReplyEnabled as boolean) ?? true,
  });
});

export default router;
