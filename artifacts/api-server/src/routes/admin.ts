import { Router } from "express";
import { eq, desc, count } from "drizzle-orm";
import { z } from "zod";
import {
  bakersTable,
  chatHandoffsTable,
  chatMessagesTable,
  conversationMemoryTable,
  customersTable,
  db,
  metaConnectionsTable,
  ordersTable,
  platformSettingsTable,
  productsTable,
  reviewsTable,
  whatsappWaitlistTable,
} from "@workspace/db";
import { sendN8nEvent } from "../lib/n8n.js";
import { isPaidPlanId } from "../lib/platform-billing.js";
import { enrichPitchData } from "../seed-enrich.js";
import {
  authenticateAdmin,
  encryptAdminMetaToken,
  isAdminAuthorization,
  isEnrichDemoAuthorization,
} from "../lib/admin-auth.js";
import { ADMIN_PLAN_IDS, buildBakerAdminUpdate } from "../lib/admin-baker-update.js";
import {
  extractPendingBilling,
  groupChatSessions,
  sortCustomersByValue,
  sortOrdersNewestFirst,
  sortProductsByDemand,
} from "../lib/admin-baker-monitor.js";
import {
  countAgentRepliesThisMonth,
  countInstagramSessionsThisMonth,
  countOrdersThisMonth,
  countProducts,
  countWhatsAppSessionsThisMonth,
  resourceLimitsForPlan,
  whatsappCapForPlan,
  instagramCapForPlan,
} from "../lib/plan-limits.js";
import { rateLimit } from "../middlewares/rate-limiter.js";
import { normalizeWaitlistSource } from "../lib/waitlist-join.js";

const router = Router();

function requireAdminBearer(req: { headers: { authorization?: string } }, res: {
  status: (code: number) => { json: (body: unknown) => void };
}): boolean {
  if (!isAdminAuthorization(req.headers.authorization)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function requireEnrichOrAdminBearer(req: { headers: { authorization?: string } }, res: {
  status: (code: number) => { json: (body: unknown) => void };
}): boolean {
  if (!isEnrichDemoAuthorization(req.headers.authorization)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * Admin login with email + password from ADMIN_EMAIL / ADMIN_PASSWORD.
 * No default credentials. Returns a signed admin JWT — never the signing secret.
 */
router.post("/admin/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  const result = authenticateAdmin(email, password);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json({ token: result.token });
});


/** One-time pitch data enrich. Requires an admin JWT or ENRICH_DEMO_SECRET. */
router.post("/admin/enrich-demo", async (req, res): Promise<void> => {
  if (!requireEnrichOrAdminBearer(req, res)) return;

  try {
    await enrichPitchData();
    res.json({ ok: true, message: "Demo bakers enriched with orders, customers, and reviews." });
  } catch (error) {
    console.error("enrich-demo failed", error);
    res.status(500).json({ error: "Enrich failed" });
  }
});

/**
 * Retrieve all registered bakers for admin overview.
 * Authorization: Bearer <admin JWT>
 */
router.get("/admin/bakers", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;

  try {
    const bakers = await db
      .select({
        id: bakersTable.id,
        businessName: bakersTable.businessName,
        ownerName: bakersTable.ownerName,
        email: bakersTable.email,
        whatsappNumber: bakersTable.whatsappNumber,
        city: bakersTable.city,
        slug: bakersTable.slug,
        subscriptionPlan: bakersTable.subscriptionPlan,
        agentActive: bakersTable.agentActive,
        marketplaceVisible: bakersTable.marketplaceVisible,
        whatsappAgentEnabled: bakersTable.whatsappAgentEnabled,
        instagramAgentEnabled: bakersTable.instagramAgentEnabled,
        totalOrders: bakersTable.totalOrders,
        trialEndsAt: bakersTable.trialEndsAt,
        createdAt: bakersTable.createdAt,
        agentConfig: bakersTable.agentConfig,
      })
      .from(bakersTable)
      .orderBy(bakersTable.id);

    const listed = bakers
      .map((baker) => {
        const pending = extractPendingBilling(baker.agentConfig);
        return {
          id: baker.id,
          businessName: baker.businessName,
          ownerName: baker.ownerName,
          email: baker.email,
          whatsappNumber: baker.whatsappNumber,
          city: baker.city,
          slug: baker.slug,
          subscriptionPlan: baker.subscriptionPlan,
          agentActive: baker.agentActive,
          marketplaceVisible: baker.marketplaceVisible,
          whatsappAgentEnabled: baker.whatsappAgentEnabled,
          instagramAgentEnabled: baker.instagramAgentEnabled,
          totalOrders: baker.totalOrders,
          trialEndsAt: baker.trialEndsAt,
          createdAt: baker.createdAt,
          pendingPlanId: pending.pendingPlanId,
          billingRequestedAt: pending.billingRequestedAt,
          billingNote: pending.billingNote,
        };
      })
      .sort((a, b) => Number(Boolean(b.pendingPlanId)) - Number(Boolean(a.pendingPlanId)) || a.id - b.id);

    res.json(listed);
  } catch (error) {
    console.error("admin get bakers failed", error);
    res.status(500).json({ error: "Failed to fetch bakers" });
  }
});

/**
 * Full bakery monitor: conversations, orders, customers, menu, usage, pending billing.
 */
router.get("/admin/bakers/:id", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;
  const bakerId = parseInt(req.params.id, 10);
  if (!Number.isInteger(bakerId) || bakerId <= 0) {
    res.status(400).json({ error: "Invalid baker ID" });
    return;
  }

  try {
    const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId)).limit(1);
    if (!baker) {
      res.status(404).json({ error: "Baker not found" });
      return;
    }

    const pending = extractPendingBilling(baker.agentConfig);
    const conf = (baker.agentConfig ?? {}) as Record<string, unknown>;
    const limits = resourceLimitsForPlan(baker.subscriptionPlan);

    const [
      messages,
      orders,
      customers,
      products,
      memories,
      handoffs,
      reviews,
      aiRepliesUsed,
      ordersThisMonth,
      productCount,
      whatsappUsed,
      instagramUsed,
    ] = await Promise.all([
      db
        .select({
          id: chatMessagesTable.id,
          bakerId: chatMessagesTable.bakerId,
          buyerId: chatMessagesTable.buyerId,
          sessionId: chatMessagesTable.sessionId,
          role: chatMessagesTable.role,
          content: chatMessagesTable.content,
          createdAt: chatMessagesTable.createdAt,
        })
        .from(chatMessagesTable)
        .where(eq(chatMessagesTable.bakerId, bakerId))
        .orderBy(desc(chatMessagesTable.createdAt))
        .limit(500),
      db.select().from(ordersTable).where(eq(ordersTable.bakerId, bakerId)).limit(200),
      db.select().from(customersTable).where(eq(customersTable.bakerId, bakerId)).limit(200),
      db.select().from(productsTable).where(eq(productsTable.bakerId, bakerId)).limit(200),
      db
        .select()
        .from(conversationMemoryTable)
        .where(eq(conversationMemoryTable.bakerId, bakerId))
        .orderBy(desc(conversationMemoryTable.lastActiveAt))
        .limit(100),
      db
        .select()
        .from(chatHandoffsTable)
        .where(eq(chatHandoffsTable.bakerId, bakerId))
        .orderBy(desc(chatHandoffsTable.updatedAt))
        .limit(50),
      db
        .select({
          id: reviewsTable.id,
          buyerName: reviewsTable.buyerName,
          rating: reviewsTable.rating,
          reviewText: reviewsTable.reviewText,
          productName: reviewsTable.productName,
          createdAt: reviewsTable.createdAt,
        })
        .from(reviewsTable)
        .where(eq(reviewsTable.bakerId, bakerId))
        .orderBy(desc(reviewsTable.createdAt))
        .limit(50),
      countAgentRepliesThisMonth(bakerId),
      countOrdersThisMonth(bakerId),
      countProducts(bakerId),
      countWhatsAppSessionsThisMonth(bakerId),
      countInstagramSessionsThisMonth(bakerId),
    ]);

    res.json({
      baker: {
        id: baker.id,
        businessName: baker.businessName,
        ownerName: baker.ownerName,
        email: baker.email,
        whatsappNumber: baker.whatsappNumber,
        city: baker.city,
        area: baker.area,
        slug: baker.slug,
        tagline: baker.tagline,
        bio: baker.bio,
        subscriptionPlan: baker.subscriptionPlan,
        agentActive: baker.agentActive,
        marketplaceVisible: baker.marketplaceVisible,
        whatsappAgentEnabled: baker.whatsappAgentEnabled,
        instagramAgentEnabled: baker.instagramAgentEnabled,
        totalOrders: baker.totalOrders,
        ratingAvg: baker.ratingAvg,
        trialEndsAt: baker.trialEndsAt,
        createdAt: baker.createdAt,
        pendingPlanId: pending.pendingPlanId,
        billingRequestedAt: pending.billingRequestedAt,
        billingNote: pending.billingNote,
        lastPlanActivatedAt: typeof conf.lastPlanActivatedAt === "string" ? conf.lastPlanActivatedAt : null,
        lastPlanActivationNote: typeof conf.lastPlanActivationNote === "string" ? conf.lastPlanActivationNote : null,
      },
      usage: {
        aiReplies: { used: aiRepliesUsed, limit: limits.aiRepliesPerMonth },
        ordersThisMonth: { used: ordersThisMonth, limit: limits.maxOrdersPerMonth },
        products: { used: productCount, limit: limits.maxProducts },
        whatsapp: { used: whatsappUsed, limit: whatsappCapForPlan(baker.subscriptionPlan) },
        instagram: { used: instagramUsed, limit: instagramCapForPlan(baker.subscriptionPlan) },
      },
      conversations: groupChatSessions(messages, handoffs).map((session) => ({
        ...session,
        buyerName: session.buyerId
          ? customers.find((customer) => customer.id === session.buyerId)?.name ?? null
          : null,
      })),
      orders: sortOrdersNewestFirst(orders).map((order) => ({
        id: order.id,
        buyerName: order.buyerName,
        buyerWhatsapp: order.buyerWhatsapp,
        totalPkr: order.totalPkr,
        status: order.status,
        paymentStatus: order.paymentStatus,
        source: order.source,
        deliveryDate: order.deliveryDate,
        createdAt: order.createdAt,
      })),
      customers: sortCustomersByValue(customers).map((customer) => ({
        id: customer.id,
        name: customer.name,
        whatsappNumber: customer.whatsappNumber,
        city: customer.city,
        preferredArea: customer.preferredArea,
        totalOrders: customer.totalOrders,
        totalSpentPkr: customer.totalSpentPkr,
        lastOrderAt: customer.lastOrderAt,
        isRegular: customer.isRegular,
        isAtRisk: customer.isAtRisk,
      })),
      products: sortProductsByDemand(products).map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        basePricePkr: product.basePricePkr,
        isAvailable: product.isAvailable,
        totalOrders: product.totalOrders,
      })),
      memories: memories.map((memory) => ({
        id: memory.id,
        buyerId: memory.buyerId,
        buyerName: memory.buyerName,
        summary: memory.summary,
        preferences: memory.preferences,
        messageCount: memory.messageCount,
        lastActiveAt: memory.lastActiveAt,
      })),
      handoffs: handoffs.map((handoff) => ({
        id: handoff.id,
        sessionId: handoff.sessionId,
        buyerId: handoff.buyerId,
        status: handoff.status,
        reason: handoff.reason,
        assignedMemberId: handoff.assignedMemberId,
        updatedAt: handoff.updatedAt,
      })),
      reviews,
    });
  } catch (error) {
    console.error("admin get baker monitor failed", error);
    res.status(500).json({ error: "Failed to load bakery" });
  }
});

/**
 * Manually activate a paid plan after JazzCash / Easypaisa / bank + WhatsApp confirmation.
 * Authorization: Bearer <admin JWT>
 */
router.post("/admin/activate-plan", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;

  const parsed = z
    .object({
      bakerId: z.number().int().positive(),
      planId: z.enum(["free", "starter", "pro", "bakery_plus"]),
      clearTrial: z.boolean().optional().default(true),
      note: z.string().trim().max(400).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [baker] = await db
    .select()
    .from(bakersTable)
    .where(eq(bakersTable.id, parsed.data.bakerId))
    .limit(1);
  if (!baker) {
    res.status(404).json({ error: "Baker not found" });
    return;
  }
  if (parsed.data.planId !== "free" && !isPaidPlanId(parsed.data.planId)) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  const prevConfig = (baker.agentConfig ?? {}) as Record<string, unknown>;
  const { pendingPlanId: _p, billingRequestedAt: _t, billingNote: _n, ...rest } = prevConfig;
  const nextConfig = {
    ...rest,
    lastPlanActivatedAt: new Date().toISOString(),
    lastPlanActivationNote: parsed.data.note ?? null,
  };
  const trialEndsAt =
    parsed.data.planId === "free"
      ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      : parsed.data.clearTrial
        ? null
        : baker.trialEndsAt;

  const [updated] = await db
    .update(bakersTable)
    .set({
      subscriptionPlan: parsed.data.planId,
      trialEndsAt,
      agentConfig: nextConfig,
    })
    .where(eq(bakersTable.id, baker.id))
    .returning();

  void sendN8nEvent("billing.plan_activated", {
    bakerId: baker.id,
    businessName: baker.businessName,
    planId: parsed.data.planId,
    previousPlan: baker.subscriptionPlan,
  });

  res.json({
    ok: true,
    bakerId: updated.id,
    subscriptionPlan: updated.subscriptionPlan,
    trialEndsAt: updated.trialEndsAt,
    message: `Activated ${parsed.data.planId} for ${baker.businessName}.`,
  });
});

const PLATFORM_BILLING_KEY = "platform_billing";

async function persistPlatformBilling(patch: {
  whatsapp?: string;
  paymentDetails?: string;
  ownerName?: string;
}): Promise<void> {
  const [existing] = await db
    .select()
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, PLATFORM_BILLING_KEY))
    .limit(1);
  const current = (existing?.value ?? {}) as Record<string, unknown>;
  const next = {
    ...current,
    ...(patch.whatsapp ? { whatsapp: patch.whatsapp } : {}),
    ...(patch.paymentDetails ? { paymentDetails: patch.paymentDetails } : {}),
    ...(patch.ownerName ? { ownerName: patch.ownerName } : {}),
  };
  if (typeof next.whatsapp === "string") process.env.PLATFORM_WHATSAPP = next.whatsapp;
  if (typeof next.paymentDetails === "string") process.env.PLATFORM_PAYMENT_DETAILS = next.paymentDetails;
  if (typeof next.ownerName === "string") process.env.PLATFORM_BILLING_NAME = next.ownerName;

  await db
    .insert(platformSettingsTable)
    .values({ key: PLATFORM_BILLING_KEY, value: next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettingsTable.key,
      set: { value: next, updatedAt: new Date() },
    });
}

export async function hydratePlatformBillingFromDb(): Promise<void> {
  const [existing] = await db
    .select()
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, PLATFORM_BILLING_KEY))
    .limit(1);
  const value = (existing?.value ?? {}) as Record<string, unknown>;
  if (typeof value.whatsapp === "string") process.env.PLATFORM_WHATSAPP = value.whatsapp;
  if (typeof value.paymentDetails === "string") process.env.PLATFORM_PAYMENT_DETAILS = value.paymentDetails;
  if (typeof value.ownerName === "string") process.env.PLATFORM_BILLING_NAME = value.ownerName;
}

router.get("/admin/platform-billing", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;
  await hydratePlatformBillingFromDb();
  const { getPlatformBillingConfig } = await import("../lib/platform-billing.js");
  res.json({ ok: true, platform: getPlatformBillingConfig() });
});

/**
 * Set platform JazzCash / WhatsApp billing details. Persists to platform_settings.
 */
router.post("/admin/platform-billing", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;

  const parsed = z
    .object({
      whatsapp: z.string().trim().min(10).max(24).optional(),
      paymentDetails: z.string().trim().min(8).max(2000).optional(),
      ownerName: z.string().trim().min(2).max(80).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    await persistPlatformBilling(parsed.data);
  } catch (error) {
    console.error("admin platform-billing persist failed", error);
    res.status(500).json({ error: "Failed to save platform billing." });
    return;
  }
  const { getPlatformBillingConfig } = await import("../lib/platform-billing.js");
  res.json({ ok: true, platform: getPlatformBillingConfig() });
});

router.patch("/admin/bakers/:id", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;
  const bakerId = parseInt(req.params.id, 10);
  if (!Number.isInteger(bakerId) || bakerId <= 0) {
    res.status(400).json({ error: "Invalid baker ID" });
    return;
  }

  const parsed = z
    .object({
      subscriptionPlan: z.enum(ADMIN_PLAN_IDS).optional(),
      agentActive: z.boolean().optional(),
      marketplaceVisible: z.boolean().optional(),
      whatsappAgentEnabled: z.boolean().optional(),
      instagramAgentEnabled: z.boolean().optional(),
      trialEndsAt: z.string().nullable().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const set = buildBakerAdminUpdate(parsed.data);
  if (!set) {
    res.status(400).json({ error: "No valid baker fields to update." });
    return;
  }

  try {
    const [updated] = await db
      .update(bakersTable)
      .set(set)
      .where(eq(bakersTable.id, bakerId))
      .returning({
        id: bakersTable.id,
        businessName: bakersTable.businessName,
        subscriptionPlan: bakersTable.subscriptionPlan,
        agentActive: bakersTable.agentActive,
        marketplaceVisible: bakersTable.marketplaceVisible,
        whatsappAgentEnabled: bakersTable.whatsappAgentEnabled,
        instagramAgentEnabled: bakersTable.instagramAgentEnabled,
        trialEndsAt: bakersTable.trialEndsAt,
      });
    if (!updated) {
      res.status(404).json({ error: "Baker not found" });
      return;
    }
    res.json({ ok: true, baker: updated });
  } catch (error) {
    console.error("admin patch baker failed", error);
    res.status(500).json({ error: "Failed to update baker" });
  }
});

/** Public: baker launch waitlist or WhatsApp-agent waitlist. */
router.post("/waitlist", rateLimit(8, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const parsed = z
    .object({
      bakerId: z.number().int().positive().optional().nullable(),
      bakerName: z.string().trim().min(1).max(100),
      bakerEmail: z.string().trim().email(),
      whatsappNumber: z.string().trim().min(10).max(24),
      city: z.string().trim().max(80).optional().nullable(),
      note: z.string().trim().max(500).optional().nullable(),
      source: z.enum(["launch", "whatsapp"]).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const source = normalizeWaitlistSource(parsed.data.source);
  const city = parsed.data.city?.trim() ? parsed.data.city.trim() : null;

  try {
    const [existing] = await db
      .select({ id: whatsappWaitlistTable.id })
      .from(whatsappWaitlistTable)
      .where(eq(whatsappWaitlistTable.bakerEmail, parsed.data.bakerEmail))
      .limit(1);
    if (existing) {
      res.status(200).json({ ok: true, alreadyJoined: true });
      return;
    }

    const [entry] = await db
      .insert(whatsappWaitlistTable)
      .values({
        bakerId: parsed.data.bakerId ?? null,
        bakerName: parsed.data.bakerName,
        bakerEmail: parsed.data.bakerEmail,
        whatsappNumber: parsed.data.whatsappNumber,
        city,
        note: parsed.data.note ?? null,
        source,
        status: "pending",
      })
      .returning();

    void sendN8nEvent("waitlist.joined", {
      id: entry.id,
      bakerName: entry.bakerName,
      bakerEmail: entry.bakerEmail,
      whatsappNumber: entry.whatsappNumber,
      source,
    });

    res.status(201).json({ ok: true, entry });
  } catch (error) {
    console.error("Failed to add to waitlist:", error);
    res.status(500).json({ error: "Failed to join waitlist" });
  }
});

router.get("/waitlist/count", rateLimit(40, 60 * 1000), async (_req, res): Promise<void> => {
  try {
    const [row] = await db.select({ total: count() }).from(whatsappWaitlistTable);
    res.json({ count: Number(row?.total ?? 0) });
  } catch (error) {
    console.error("Failed to count waitlist:", error);
    res.status(500).json({ error: "Failed to count waitlist" });
  }
});

/** Admin: retrieve all waitlist entries. */
router.get("/admin/waitlist", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;

  try {
    const entries = await db
      .select()
      .from(whatsappWaitlistTable)
      .orderBy(desc(whatsappWaitlistTable.id));

    res.json(entries);
  } catch (error) {
    console.error("Failed to fetch waitlist:", error);
    res.status(500).json({ error: "Failed to fetch waitlist" });
  }
});

/** Admin: update waitlist status (pending -> contacted -> approved). */
router.patch("/admin/waitlist/:id", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid waitlist ID" });
    return;
  }

  const parsed = z
    .object({
      status: z.enum(["pending", "contacted", "approved"]),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [updated] = await db
      .update(whatsappWaitlistTable)
      .set({ status: parsed.data.status })
      .where(eq(whatsappWaitlistTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Waitlist entry not found" });
      return;
    }

    res.json({ ok: true, entry: updated });
  } catch (error) {
    console.error("Failed to update waitlist entry:", error);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

/**
 * Admin: directly set WhatsApp / Instagram credentials for any baker by ID.
 * Bypasses Meta Embedded Signup — useful for unverified business portfolios.
 * Tokens are AES-256-GCM encrypted at rest using TOKEN_ENCRYPTION_KEY.
 * POST /api/admin/set-baker-meta
 * Authorization: Bearer <admin JWT>
 */
router.post("/admin/set-baker-meta", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;

  const parsed = z
    .object({
      bakerId: z.number().int().positive(),
      whatsappPhoneNumberId: z.string().trim().min(1).max(64).optional(),
      whatsappAccessToken: z.string().trim().min(1).max(512).optional(),
      whatsappWabaId: z.string().trim().min(1).max(64).optional(),
      metaAppSecret: z.string().trim().min(1).max(128).optional(),
      instagramPageId: z.string().trim().min(1).max(64).optional(),
      instagramAccessToken: z.string().trim().min(1).max(512).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Verify baker exists
  const [baker] = await db
    .select({ id: bakersTable.id, businessName: bakersTable.businessName })
    .from(bakersTable)
    .where(eq(bakersTable.id, parsed.data.bakerId))
    .limit(1);

  if (!baker) {
    res.status(404).json({ error: `Baker #${parsed.data.bakerId} not found.` });
    return;
  }

  const d = parsed.data;
  const upsertValues: Record<string, unknown> = {
    bakerId: d.bakerId,
    status: "active",
  };

  if (d.whatsappPhoneNumberId) upsertValues.whatsappPhoneNumberId = d.whatsappPhoneNumberId;
  if (d.whatsappWabaId) upsertValues.whatsappBusinessAccountId = d.whatsappWabaId;
  if (d.metaAppSecret) upsertValues.metaAppSecret = d.metaAppSecret;
  if (d.instagramPageId) upsertValues.instagramPageId = d.instagramPageId;

  try {
    if (d.whatsappAccessToken) {
      upsertValues.whatsappAccessTokenEncrypted = encryptAdminMetaToken(d.whatsappAccessToken);
    }
    if (d.instagramAccessToken) {
      upsertValues.instagramAccessTokenEncrypted = encryptAdminMetaToken(d.instagramAccessToken);
    }
  } catch {
    res.status(503).json({ error: "TOKEN_ENCRYPTION_KEY is required to store Meta tokens." });
    return;
  }

  try {
    await db
      .insert(metaConnectionsTable)
      .values(upsertValues as typeof metaConnectionsTable.$inferInsert)
      .onConflictDoUpdate({
        target: metaConnectionsTable.bakerId,
        set: upsertValues as Partial<typeof metaConnectionsTable.$inferInsert>,
      });

    res.json({
      ok: true,
      bakerId: d.bakerId,
      businessName: baker.businessName,
      fieldsSet: Object.keys(d).filter((k) => k !== "bakerId"),
      message: `Meta credentials saved for ${baker.businessName ?? `baker #${d.bakerId}`}.`,
    });
  } catch (err) {
    console.error("admin set-baker-meta failed", err);
    res.status(500).json({ error: "Failed to save credentials." });
  }
});

export default router;
