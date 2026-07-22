import { Router } from "express";
import crypto from "node:crypto";
import { eq, inArray, or, sql } from "drizzle-orm";
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
import { z } from "zod";
import { clerkClient } from "@clerk/express";
import {
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
  signToken,
} from "../lib/auth.js";
import {
  type AuthenticatedRequest,
  requireBakerAuth,
  requireBakerOwnership,
  requireClerkUser,
} from "../middlewares/auth.js";
import { rebuildBakerKnowledgeIndex } from "../lib/rag/pipeline.js";
import { rateLimit } from "../middlewares/rate-limiter.js";

const router = Router();

function normalizePakistanPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("3")) digits = `92${digits}`;
  return /^923\d{9}$/.test(digits) ? `+${digits}` : null;
}

function phoneLookupVariants(value: string, normalized: string | null): string[] {
  const raw = value.trim();
  if (!normalized) return [raw];
  const digits = normalized.slice(1);
  return [...new Set([raw, normalized, digits, `0${digits.slice(2)}`, digits.slice(2)])];
}

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { code?: unknown; cause?: { code?: unknown } };
  return typeof candidate.code === "string"
    ? candidate.code
    : typeof candidate.cause?.code === "string"
      ? candidate.cause.code
      : undefined;
}

function toPublicBaker(baker: Record<string, unknown>) {
  const {
    passwordHash,
    metaWebhookToken,
    whatsappNumber,
    email,
    paymentDetails,
    clerkUserId,
    clerkOrganizationId,
    ...publicBaker
  } = baker;
  const digits = String(whatsappNumber ?? "").replace(/\D/g, "");
  const internationalNumber = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  return {
    ...publicBaker,
    // Share a safe customer handoff URL rather than exposing the raw phone
    // number in every marketplace response. The agent must be explicitly on.
    whatsappChatUrl: baker.whatsappAgentEnabled && internationalNumber
      ? `https://wa.me/${internationalNumber}?text=${encodeURIComponent(`Assalam-o-Alaikum! I found ${String(baker.businessName ?? "your bakery")} on Sweet Tooth and need help with an order.`)}`
      : null,
    publicShopSettings: {
      menuAccent: (baker.agentConfig as Record<string, unknown> | null)?.menuAccent ?? "#7c3aed",
      availabilityHours: (baker.agentConfig as Record<string, unknown> | null)?.availabilityHours ?? "",
      dietaryPolicy: (baker.agentConfig as Record<string, unknown> | null)?.dietaryPolicy ?? "",
      preferredCustomerChannel: (baker.agentConfig as Record<string, unknown> | null)?.preferredCustomerChannel ?? "web",
    },
    socialLinks: (baker.agentConfig as Record<string, unknown> | null)?.socialLinks ?? {},
  };
}

function toAuthenticatedBaker(baker: Record<string, unknown>) {
  const {
    passwordHash,
    metaWebhookToken,
    clerkUserId,
    clerkOrganizationId,
    ...safeBaker
  } = baker;
  return safeBaker;
}

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
      return { ...toPublicBaker(b), deliveryAreas: b.deliveryAreas ?? [], categories, startingPrice };
    })
  );
  res.json(bakerCards);
});

async function getVerifiedClerkEmail(userId: string): Promise<string> {
  const user = await clerkClient.users.getUser(userId);
  const primary = user.emailAddresses.find(
    (email) =>
      email.id === user.primaryEmailAddressId &&
      email.verification?.status === "verified",
  );
  if (!primary) {
    throw new Error("A verified primary email is required.");
  }
  return primary.emailAddress.trim().toLowerCase();
}

async function findClerkBaker(request: AuthenticatedRequest) {
  if (request.clerkOrganizationId) {
    const [organizationBaker] = await db
      .select()
      .from(bakersTable)
      .where(eq(bakersTable.clerkOrganizationId, request.clerkOrganizationId))
      .limit(1);
    if (organizationBaker) return organizationBaker;
  }

  if (request.clerkUserId) {
    const [userBaker] = await db
      .select()
      .from(bakersTable)
      .where(eq(bakersTable.clerkUserId, request.clerkUserId))
      .limit(1);
    if (userBaker) return userBaker;
  }

  return null;
}

// GET /bakers/clerk/session — resolve a managed Clerk identity to its bakery.
router.get("/bakers/clerk/session", requireClerkUser, async (req, res): Promise<void> => {
  const request = req as AuthenticatedRequest;
  const linked = await findClerkBaker(request);
  if (linked) {
    res.json({
      needsOnboarding: false,
      baker: { ...toAuthenticatedBaker(linked), deliveryAreas: linked.deliveryAreas ?? [] },
    });
    return;
  }

  const email = await getVerifiedClerkEmail(request.clerkUserId!);
  const [existingByEmail] = await db
    .select()
    .from(bakersTable)
    .where(eq(bakersTable.email, email))
    .limit(1);

  if (existingByEmail?.clerkUserId && existingByEmail.clerkUserId !== request.clerkUserId) {
    res.status(409).json({ error: "This bakery is already linked to another managed account." });
    return;
  }

  if (existingByEmail) {
    const [claimed] = await db
      .update(bakersTable)
      .set({
        clerkUserId: request.clerkUserId!,
        ...(request.clerkOrganizationId
          ? { clerkOrganizationId: request.clerkOrganizationId }
          : {}),
      })
      .where(eq(bakersTable.id, existingByEmail.id))
      .returning();
    res.json({
      needsOnboarding: false,
      baker: { ...toAuthenticatedBaker(claimed), deliveryAreas: claimed.deliveryAreas ?? [] },
    });
    return;
  }

  res.json({ needsOnboarding: true, email });
});

// POST /bakers/clerk/onboard — create the bakery after Clerk has verified identity.
router.post(
  "/bakers/clerk/onboard",
  requireClerkUser,
  rateLimit(5, 15 * 60 * 1000),
  async (req, res): Promise<void> => {
    const schema = z.object({
      businessName: z.string().trim().min(2).max(120),
      ownerName: z.string().trim().min(2).max(120),
      city: z.string().trim().min(2).max(80),
      whatsappNumber: z.string().trim().min(10).max(30),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const request = req as AuthenticatedRequest;
    if (await findClerkBaker(request)) {
      res.status(409).json({ error: "This managed account already has a bakery." });
      return;
    }

    const email = await getVerifiedClerkEmail(request.clerkUserId!);
    const normalizedPhone = normalizePakistanPhone(parsed.data.whatsappNumber);
    if (!normalizedPhone) {
      res.status(400).json({ error: "Enter a valid Pakistani WhatsApp number." });
      return;
    }

    const phoneVariants = phoneLookupVariants(parsed.data.whatsappNumber, normalizedPhone);
    const [existing] = await db
      .select({ id: bakersTable.id })
      .from(bakersTable)
      .where(or(eq(bakersTable.email, email), inArray(bakersTable.whatsappNumber, phoneVariants)));
    if (existing) {
      res.status(409).json({
        error: "A bakery already uses this email or WhatsApp number. Sign in with its verified email to link it.",
      });
      return;
    }

    const slugBase =
      parsed.data.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "bakery";
    const [baker] = await db
      .insert(bakersTable)
      .values({
        ...parsed.data,
        whatsappNumber: normalizedPhone,
        email,
        slug: `${slugBase}-${crypto.randomBytes(4).toString("hex")}`,
        clerkUserId: request.clerkUserId!,
        clerkOrganizationId: request.clerkOrganizationId ?? null,
        passwordHash: null,
      })
      .returning();

    res.status(201).json({
      needsOnboarding: false,
      baker: { ...toAuthenticatedBaker(baker), deliveryAreas: baker.deliveryAreas ?? [] },
    });
  },
);

// POST /bakers (Register / Signup)
router.post("/bakers", rateLimit(10, 15 * 60 * 1000), async (req, res): Promise<void> => {
  if (process.env.AUTH_MODE === "clerk-only") {
    res.status(410).json({ error: "Use managed sign-up to create a bakery account." });
    return;
  }
  // We expect email and password in request body
  const schema = z.object({
    businessName: z.string(),
    ownerName: z.string(),
    city: z.string(),
    whatsappNumber: z.string(),
    slug: z.string(),
    email: z.string().email(),
    password: z.string().min(12).max(128),
    tagline: z.string().optional(),
    bio: z.string().optional(),
  });
  
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const normalizedPhone = normalizePakistanPhone(parsed.data.whatsappNumber);
  if (!normalizedPhone) {
    res.status(400).json({ error: "Enter a valid Pakistani WhatsApp number, for example +92 300 1234567." });
    return;
  }
  const { password, whatsappNumber: _whatsappNumber, ...rest } = parsed.data;
  const passwordHash = hashPassword(password);
  const phoneVariants = phoneLookupVariants(parsed.data.whatsappNumber, normalizedPhone);
  const [existingBaker] = await db.select({ id: bakersTable.id }).from(bakersTable).where(or(
    eq(bakersTable.email, rest.email.trim().toLowerCase()),
    inArray(bakersTable.whatsappNumber, phoneVariants),
  ));
  if (existingBaker) {
    res.status(409).json({ error: "An account with this email or WhatsApp number already exists. Sign in instead." });
    return;
  }

  try {
    const [baker] = await db.insert(bakersTable).values({
      ...rest,
      whatsappNumber: normalizedPhone,
      passwordHash,
    }).returning();
    
    const token = signToken({ bakerId: baker.id, email: baker.email });
    res.status(201).json({ token, baker: { ...toAuthenticatedBaker(baker), deliveryAreas: baker.deliveryAreas ?? [] } });
  } catch (error) {
    if (databaseErrorCode(error) === "23505") {
      res.status(409).json({ error: "An account with this email or WhatsApp number already exists. Sign in instead." });
    } else {
      console.error("Baker registration failed", error);
      res.status(500).json({ error: "We could not create your bakery right now. Please try again in a moment." });
    }
  }
});

// POST /bakers/login
router.post("/bakers/login", rateLimit(10, 15 * 60 * 1000), async (req, res): Promise<void> => {
  if (process.env.AUTH_MODE === "clerk-only") {
    res.status(410).json({ error: "Use managed sign-in to access the bakery dashboard." });
    return;
  }
  const schema = z.object({
    identifier: z.string().min(3),
    password: z.string(),
  });
  
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { identifier, password } = parsed.data;
  const normalizedPhone = normalizePakistanPhone(identifier);
  const phoneVariants = phoneLookupVariants(identifier, normalizedPhone);
  const [baker] = await db.select().from(bakersTable).where(or(
    eq(bakersTable.email, identifier.trim().toLowerCase()),
    inArray(bakersTable.whatsappNumber, phoneVariants),
  ));
  
  if (!baker || !baker.passwordHash) {
    res.status(401).json({ error: "Invalid email/number or password" });
    return;
  }

  const isMatch = verifyPassword(password, baker.passwordHash);
  if (!isMatch) {
    res.status(401).json({ error: "Invalid email/number or password" });
    return;
  }

  if (needsPasswordRehash(baker.passwordHash)) {
    await db
      .update(bakersTable)
      .set({ passwordHash: hashPassword(password) })
      .where(eq(bakersTable.id, baker.id));
  }

  const token = signToken({ bakerId: baker.id, email: baker.email });
  res.json({ token, baker: { ...toAuthenticatedBaker(baker), deliveryAreas: baker.deliveryAreas ?? [] } });
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
  res.json({ ...toPublicBaker(baker), deliveryAreas: baker.deliveryAreas ?? [] });
});

// PATCH /bakers/:bakerId (Secured)
router.patch("/bakers/:bakerId", requireBakerAuth, async (req, res): Promise<void> => {
  const params = UpdateBakerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  
  const tokenBakerId = (req as any).bakerId;
  if (tokenBakerId !== params.data.bakerId) {
    res.status(403).json({ error: "Unauthorized access to this baker profile." });
    return;
  }

  const parsed = UpdateBakerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  
  const { socialLinks, blockedDates, ...profileUpdates } = parsed.data as typeof parsed.data & { 
    socialLinks?: { instagram?: string; facebook?: string };
    blockedDates?: string[];
  };
  const [existing] = await db.select().from(bakersTable).where(eq(bakersTable.id, params.data.bakerId));
  if (!existing) {
    res.status(404).json({ error: "Baker not found" });
    return;
  }
  const currentConfig = (existing.agentConfig ?? {}) as Record<string, unknown>;
  const [baker] = await db.update(bakersTable).set({
    ...profileUpdates,
    agentConfig: {
      ...currentConfig,
      ...(socialLinks !== undefined ? { socialLinks } : {}),
      ...(blockedDates !== undefined ? { blockedDates } : {}),
    }
  }).where(eq(bakersTable.id, params.data.bakerId)).returning();
  if (!baker) {
    res.status(404).json({ error: "Baker not found" });
    return;
  }
  // Policies and delivery areas are agent knowledge. Keep the retrieval index
  // in sync whenever a baker updates their shop profile.
  rebuildBakerKnowledgeIndex(baker.id).catch((error) =>
    console.error(`Auto-RAG reindex failed for baker #${baker.id}:`, error),
  );
  res.json({ ...toAuthenticatedBaker(baker), deliveryAreas: baker.deliveryAreas ?? [] });
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
router.get("/bakers/:bakerId/stats", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
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

function maskWebhookToken(token: string | null): { metaWebhookTokenSet: boolean; metaWebhookTokenPreview: string | null } {
  if (!token) return { metaWebhookTokenSet: false, metaWebhookTokenPreview: null };
  return { metaWebhookTokenSet: true, metaWebhookTokenPreview: `${token.slice(0, 4)}••••` };
}

// GET /bakers/:bakerId/agent-config
router.get("/bakers/:bakerId/agent-config", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const bakerId = parseInt(String(req.params.bakerId), 10);
  if (isNaN(bakerId)) { res.status(400).json({ error: "Invalid bakerId" }); return; }
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!baker) { res.status(404).json({ error: "Baker not found" }); return; }
  const conf = (baker.agentConfig ?? {}) as Record<string, unknown>;
  const tokenMask = maskWebhookToken(baker.metaWebhookToken);
  res.json({
    bakerId: baker.id,
    agentActive: baker.agentActive,
    whatsappAgentEnabled: baker.whatsappAgentEnabled,
    instagramAgentEnabled: baker.instagramAgentEnabled,
    ...tokenMask,
    instagramPageId: baker.instagramPageId,
    customGreeting: (conf.customGreeting as string | null) ?? null,
    blockedTopics: (conf.blockedTopics as string[]) ?? [],
    escalateKeywords: (conf.escalateKeywords as string[]) ?? [],
    autoReplyEnabled: (conf.autoReplyEnabled as boolean) ?? true,
    customResponses: (conf.customResponses as Array<{ trigger: string; response: string }>) ?? [],
    menuAccent: (conf.menuAccent as string | null) ?? "#7c3aed",
    availabilityHours: (conf.availabilityHours as string | null) ?? "",
    dietaryPolicy: (conf.dietaryPolicy as string | null) ?? "",
    activeOffers: (conf.activeOffers as string | null) ?? "",
    preferredCustomerChannel: (conf.preferredCustomerChannel as "web" | "whatsapp" | "instagram" | null) ?? "web",
    blockedDates: (conf.blockedDates as string[]) ?? [],
    whatsappWebhookUrl: "/api/webhooks/whatsapp",
  });
});

// PUT /bakers/:bakerId/agent-config
router.put("/bakers/:bakerId/agent-config", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const bakerId = parseInt(String(req.params.bakerId), 10);
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
    menuAccent?: string;
    availabilityHours?: string;
    dietaryPolicy?: string;
    activeOffers?: string;
    preferredCustomerChannel?: "web" | "whatsapp" | "instagram";
    blockedDates?: string[];
  };
  const agentConfigUpdate: Record<string, unknown> = {};
  if (body.customGreeting !== undefined) agentConfigUpdate.customGreeting = body.customGreeting;
  if (body.blockedTopics !== undefined) agentConfigUpdate.blockedTopics = body.blockedTopics;
  if (body.escalateKeywords !== undefined) agentConfigUpdate.escalateKeywords = body.escalateKeywords;
  if (body.autoReplyEnabled !== undefined) agentConfigUpdate.autoReplyEnabled = body.autoReplyEnabled;
  if (body.customResponses !== undefined) agentConfigUpdate.customResponses = body.customResponses;
  if (body.menuAccent !== undefined && /^#[0-9a-fA-F]{6}$/.test(body.menuAccent)) agentConfigUpdate.menuAccent = body.menuAccent;
  if (body.availabilityHours !== undefined) agentConfigUpdate.availabilityHours = body.availabilityHours.slice(0, 240);
  if (body.dietaryPolicy !== undefined) agentConfigUpdate.dietaryPolicy = body.dietaryPolicy.slice(0, 600);
  if (body.activeOffers !== undefined) agentConfigUpdate.activeOffers = body.activeOffers.slice(0, 600);
  if (body.preferredCustomerChannel !== undefined) agentConfigUpdate.preferredCustomerChannel = body.preferredCustomerChannel;
  if (body.blockedDates !== undefined) agentConfigUpdate.blockedDates = body.blockedDates;

  const [existing] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!existing) { res.status(404).json({ error: "Baker not found" }); return; }

  const mergedAgentConfig = {
    ...((existing.agentConfig ?? {}) as Record<string, unknown>),
    ...agentConfigUpdate,
  };

  const update: Record<string, unknown> = { agentConfig: mergedAgentConfig };
  if (body.agentActive !== undefined) update.agentActive = body.agentActive;
  if (body.whatsappAgentEnabled !== undefined) update.whatsappAgentEnabled = body.whatsappAgentEnabled;
  if (body.instagramAgentEnabled !== undefined) update.instagramAgentEnabled = body.instagramAgentEnabled;
  if (body.metaWebhookToken !== undefined) update.metaWebhookToken = body.metaWebhookToken;
  if (body.instagramPageId !== undefined) update.instagramPageId = body.instagramPageId;

  const [baker] = await db.update(bakersTable).set(update).where(eq(bakersTable.id, bakerId)).returning();
  if (!baker) { res.status(404).json({ error: "Baker not found" }); return; }
  const conf = (baker.agentConfig ?? {}) as Record<string, unknown>;
  const tokenMask = maskWebhookToken(baker.metaWebhookToken);
  res.json({
    bakerId: baker.id,
    agentActive: baker.agentActive,
    whatsappAgentEnabled: baker.whatsappAgentEnabled,
    instagramAgentEnabled: baker.instagramAgentEnabled,
    ...tokenMask,
    instagramPageId: baker.instagramPageId,
    customGreeting: (conf.customGreeting as string | null) ?? null,
    blockedTopics: (conf.blockedTopics as string[]) ?? [],
    escalateKeywords: (conf.escalateKeywords as string[]) ?? [],
    autoReplyEnabled: (conf.autoReplyEnabled as boolean) ?? true,
    customResponses: (conf.customResponses as Array<{ trigger: string; response: string }>) ?? [],
    menuAccent: (conf.menuAccent as string | null) ?? "#7c3aed",
    availabilityHours: (conf.availabilityHours as string | null) ?? "",
    dietaryPolicy: (conf.dietaryPolicy as string | null) ?? "",
    activeOffers: (conf.activeOffers as string | null) ?? "",
    preferredCustomerChannel: (conf.preferredCustomerChannel as "web" | "whatsapp" | "instagram" | null) ?? "web",
    blockedDates: (conf.blockedDates as string[]) ?? [],
    whatsappWebhookUrl: "/api/webhooks/whatsapp",
  });
});

export default router;
