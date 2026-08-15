import { Router } from "express";
import { eq, and, gt, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, ordersTable, productsTable, bakersTable, customersTable, notificationsTable } from "@workspace/db";
import {
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  MarkOrderPaidParams,
  MarkOrderPaidBody,
  ListOrdersQueryParams,
} from "@workspace/api-zod";
import { triggerPaymentOCRVerification } from "../lib/ocr.js";
import { AuthenticatedRequest, requireBakerAuth, requireBakerOwner } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rate-limiter.js";
import { logOrderActivity, getActorFromRequest } from "../lib/audit.js";

import { normalizePakistanPhone } from "../lib/phone.js";
import {
  recordOrderFeedback,
  sendDeliveryFeedbackRequest,
  sendGuestActionLink,
  sendOrderStatusUpdate,
  type ServiceFeedback,
} from "../lib/order-feedback.js";
import { maybeSendAdvanceReminder } from "../lib/advance-reminder.js";
import { syncBakerStats } from "../lib/seed-baker-demo.js";
import { sendN8nEvent } from "../lib/n8n.js";
import { isOrderCapReached } from "../lib/plan-limits.js";
import { toReceiptDataUrl } from "../lib/receipt-image.js";
import { findDeliveryZone, normalizeDeliveryZones } from "../lib/delivery-zones.js";
import { createGuestActionToken, guestOrderUrl, verifyGuestActionToken, type GuestActionScope } from "../lib/guest-action-token.js";

const router = Router();

const ManualOrderBody = z.object({
  buyerName: z.string().trim().min(1).max(120),
  buyerWhatsapp: z.string().trim().min(6).max(32),
  buyerAddress: z.string().trim().min(3).max(500),
  buyerArea: z.string().trim().max(120).optional(),
  productName: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(100).default(1),
  totalPkr: z.number().int().min(0).max(10_000_000),
  deliveryDate: z.string().date().optional(),
  deliveryTimeSlot: z.string().trim().max(80).optional(),
  occasion: z.string().trim().max(120).optional(),
  specialInstructions: z.string().trim().max(600).optional(),
});

const DispatchOrderBody = z.object({
  deliveryTimeSlot: z.string().trim().max(80).nullable().optional(),
  riderName: z.string().trim().max(100).nullable().optional(),
  riderPhone: z.string().trim().max(32).nullable().optional(),
});

const RefundOrderBody = z.object({
  amountPkr: z.number().int().min(0).max(10_000_000),
  reason: z.string().trim().min(3).max(500),
});

const CustomQuoteRequestBody = z.object({
  bakerId: z.number().int().positive(),
  buyerName: z.string().trim().min(2).max(120),
  buyerWhatsapp: z.string().trim().min(10).max(24),
  buyerArea: z.string().trim().max(120).optional(),
  buyerAddress: z.string().trim().max(500).optional(),
  deliveryDate: z.string().date().optional(),
  servings: z.number().int().min(1).max(500),
  cakeType: z.string().trim().min(2).max(120),
  flavour: z.string().trim().max(120).optional(),
  occasion: z.string().trim().max(120).optional(),
  allergies: z.string().trim().max(300).optional(),
  inspirationImageUrl: z.string().url().max(1000).optional(),
  specialInstructions: z.string().trim().min(5).max(600),
});

const QuoteApprovalBody = z.object({
  totalPkr: z.number().int().min(100).max(10_000_000),
  deliveryDate: z.string().date().optional(),
  expiresInDays: z.number().int().min(1).max(30).default(3),
});

const QuoteResponseBody = z.object({
  token: z.string().trim().min(40),
  decision: z.enum(["accept", "reject"]),
});

function guestTokenFor(order: typeof ordersTable.$inferSelect, scopes: GuestActionScope[], expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
  return createGuestActionToken({ orderId: order.id, bakerId: order.bakerId, scopes, expiresAt });
}

function safeGuestOrder(order: typeof ordersTable.$inferSelect) {
  return {
    id: order.id,
    bakerId: order.bakerId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalPkr: order.totalPkr,
    deliveryDate: order.deliveryDate,
    createdAt: order.createdAt,
    items: (order.items as unknown[]) ?? [],
    depositRequiredPkr: order.depositRequiredPkr,
    quoteExpiresAt: order.quoteExpiresAt,
    requireAdvance: order.requireAdvance,
    advancePaid: order.advancePaid,
  };
}

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return { ...o, items: (o.items as unknown[]) ?? [] };
}

function formatOrderForRole(o: typeof ordersTable.$inferSelect, role?: string) {
  const formatted = formatOrder(o);
  if (role === "owner") return formatted;
  // Staff need fulfilment context, but not receipt images, deposit state, or
  // payment amounts. Financial records remain owner-only.
  return {
    ...formatted,
    paymentStatus: "restricted",
    paymentAmountReceived: null,
    paymentScreenshotUrl: null,
    advancePaid: false,
    requireAdvance: false,
  };
}

/**
 * Calendar rules must be enforced at the API boundary, not only displayed in
 * the dashboard. Unquoted custom requests do not consume capacity; a baker
 * decides whether to reserve a slot when accepting the quote.
 */
async function getScheduleBlockReason(
  baker: typeof bakersTable.$inferSelect,
  deliveryDate?: string | null,
): Promise<string | null> {
  if (!deliveryDate) return null;

  const config = (baker.agentConfig ?? {}) as { blockedDates?: unknown };
  const blockedDates = Array.isArray(config.blockedDates)
    ? config.blockedDates.filter((date): date is string => typeof date === "string")
    : [];
  if (blockedDates.includes(deliveryDate)) {
    return "This bakery is not accepting orders for that date. Please choose another date or ask the baker about availability.";
  }

  const maxOrders = Number(baker.maxOrdersPerDay ?? 0);
  if (!Number.isInteger(maxOrders) || maxOrders <= 0) return null;
  const booked = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.bakerId, baker.id),
      eq(ordersTable.deliveryDate, deliveryDate),
      ne(ordersTable.status, "cancelled"),
      ne(ordersTable.status, "quoted"),
      ne(ordersTable.status, "quote_rejected"),
      gt(ordersTable.totalPkr, 0),
    ));
  return booked.length >= maxOrders
    ? `This bakery is fully booked for ${deliveryDate}. Please choose another date or ask about pickup availability.`
    : null;
}

const guestOrderSchema = z.object({
  bakerId: z.number().int().positive(),
  buyerName: z.string().trim().min(2).max(120),
  buyerWhatsapp: z.string().trim().min(10).max(24),
  buyerAddress: z.string().trim().min(5).max(400),
  buyerArea: z.string().trim().max(120).optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(50),
    sizeLabel: z.string().trim().min(1).max(80).optional(),
    variant: z.string().trim().max(80).nullable().optional(),
  })).min(1).max(30),
  deliveryDate: z.string().date().optional(),
  fulfillmentType: z.enum(["delivery", "pickup"]).optional(),
  specialInstructions: z.string().trim().max(600).optional(),
  source: z.string().trim().max(40).optional(),
});

// GET /orders
router.get("/orders", requireBakerAuth, async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const bakerId = (req as AuthenticatedRequest).bakerId!;
  let dbQuery = db.select().from(ordersTable).where(eq(ordersTable.bakerId, bakerId)).$dynamic();
  if (query.data.status) dbQuery = dbQuery.where(and(eq(ordersTable.bakerId, bakerId), eq(ordersTable.status, query.data.status)));
  const orders = await dbQuery;
  res.json(orders.map((order) => formatOrderForRole(order, (req as AuthenticatedRequest).memberRole)));
});

// GET /orders/lookup?phone= — buyer self-serve status (no payment details)
router.get("/orders/lookup", rateLimit(20, 15 * 60 * 1000), async (req, res): Promise<void> => {
  res.status(410).json({ error: "For privacy, order status now opens only from the secure link sent by the bakery." });
});

router.get("/orders/:orderId/guest-link", requireBakerAuth, requireBakerOwner, async (req, res): Promise<void> => {
  const orderId = Number.parseInt(String(req.params.orderId), 10);
  const action = z.enum(["view", "quote", "receipt", "feedback"]).safeParse(req.query.action ?? "view");
  if (!Number.isInteger(orderId) || !action.success) {
    res.status(400).json({ error: "Invalid guest-link request." });
    return;
  }
  const bakerId = (req as AuthenticatedRequest).bakerId!;
  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.bakerId, bakerId))).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  if (action.data === "quote" && order.status !== "quoted") {
    res.status(409).json({ error: "Only a quoted order can receive a quote-response link." });
    return;
  }
  if (action.data === "feedback" && order.status !== "delivered") {
    res.status(409).json({ error: "Feedback links are available after delivery." });
    return;
  }
  const scopes: GuestActionScope[] = action.data === "quote" ? ["quote", "receipt"] : action.data === "view" ? [] : [action.data];
  const expiresAt = new Date(Date.now() + (action.data === "feedback" ? 14 : 30) * 24 * 60 * 60 * 1000);
  res.setHeader("Cache-Control", "no-store");
  res.json({ url: guestOrderUrl({ orderId, bakerId, scopes, expiresAt, action: action.data === "view" ? undefined : action.data }), expiresAt });
});

router.get("/orders/:orderId/guest", rateLimit(40, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const orderId = Number.parseInt(String(req.params.orderId), 10);
  const token = String(req.header("x-guest-token") ?? "");
  if (!Number.isInteger(orderId) || !token) {
    res.status(400).json({ error: "Invalid secure order link." });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order || !verifyGuestActionToken(token, { orderId, bakerId: order.bakerId, scope: "view" })) {
    res.status(404).json({ error: "This secure order link is invalid or has expired." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(safeGuestOrder(order));
});

// POST /orders — guest checkout with server-side price verification
router.post("/orders", rateLimit(15, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const parsed = guestOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const phone = normalizePakistanPhone(parsed.data.buyerWhatsapp);
  if (!phone) {
    res.status(400).json({ error: "Enter a valid Pakistani WhatsApp number, for example +92 300 1234567." });
    return;
  }

  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, parsed.data.bakerId)).limit(1);
  if (!baker || baker.marketplaceVisible === false) {
    res.status(404).json({ error: "Baker not found." });
    return;
  }

  const orderCap = await isOrderCapReached(baker.id, baker.subscriptionPlan);
  if (orderCap.capped) {
    res.status(403).json({
      error: "This bakery has reached its monthly order limit. Please WhatsApp them directly or try again next month.",
    });
    return;
  }

  const scheduleBlock = await getScheduleBlockReason(baker, parsed.data.deliveryDate);
  if (scheduleBlock) {
    res.status(409).json({ error: scheduleBlock });
    return;
  }

  const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.bakerId, parsed.data.bakerId), inArray(productsTable.id, productIds)));
  if (products.length !== productIds.length) {
    res.status(400).json({ error: "One or more products are invalid for this bakery." });
    return;
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const lineItems: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPricePkr: number;
    sizeLabel: string;
    variant: string | null;
  }> = [];
  for (const item of parsed.data.items) {
    const product = productById.get(item.productId)!;
    if (!product.isAvailable) {
      res.status(400).json({ error: `"${product.name}" is currently unavailable.` });
      return;
    }
    const sizes = (product.sizes as Array<{ label: string; pricePkr: number }> | null) ?? [];
    const matchedSize = item.sizeLabel
      ? sizes.find((s) => s.label === item.sizeLabel)
      : sizes[0];
    const unitPricePkr = matchedSize?.pricePkr ?? product.basePricePkr;
    lineItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPricePkr,
      sizeLabel: matchedSize?.label ?? item.sizeLabel ?? "Standard",
      variant: item.variant ?? null,
    });
  }

  const itemSubtotalPkr = lineItems.reduce((sum, item) => sum + item.unitPricePkr * item.quantity, 0);
  let deliveryFeePkr = 0;
  if ((parsed.data.fulfillmentType ?? "delivery") === "delivery") {
    const zones = normalizeDeliveryZones((baker.agentConfig as Record<string, unknown> | null)?.deliveryZones);
    if (zones.length) {
      const zone = findDeliveryZone(zones, parsed.data.buyerArea);
      if (!zone) {
        res.status(400).json({ error: "Delivery is not available for this area. Choose one of this bakery's listed delivery zones or pickup." });
        return;
      }
      if (zone.minimumOrderPkr && itemSubtotalPkr < zone.minimumOrderPkr) {
        res.status(400).json({ error: `Delivery to ${zone.name} needs a minimum product total of PKR ${zone.minimumOrderPkr.toLocaleString()}.` });
        return;
      }
      deliveryFeePkr = zone.feePkr;
      if (deliveryFeePkr > 0) {
        lineItems.push({
          productId: 0,
          productName: `Delivery fee (${zone.name})`,
          quantity: 1,
          unitPricePkr: deliveryFeePkr,
          sizeLabel: "Delivery",
          variant: null,
        });
      }
    }
  }
  const totalPkr = itemSubtotalPkr + deliveryFeePkr;

  try {
    const [existingCustomer] = await db
      .select()
      .from(customersTable)
      .where(and(eq(customersTable.bakerId, parsed.data.bakerId), eq(customersTable.whatsappNumber, phone)))
      .limit(1);

    let buyerId: number | null = existingCustomer?.id ?? null;
    if (existingCustomer) {
      await db
        .update(customersTable)
        .set({
          name: parsed.data.buyerName,
          preferredArea: parsed.data.buyerArea ?? existingCustomer.preferredArea,
          totalOrders: existingCustomer.totalOrders + 1,
          totalSpentPkr: existingCustomer.totalSpentPkr + totalPkr,
          lastOrderAt: new Date(),
          isAtRisk: false,
          isRegular: existingCustomer.totalOrders + 1 >= 3,
        })
        .where(eq(customersTable.id, existingCustomer.id));
    } else {
      const [created] = await db
        .insert(customersTable)
        .values({
          bakerId: parsed.data.bakerId,
          name: parsed.data.buyerName,
          whatsappNumber: phone,
          city: baker.city,
          preferredArea: parsed.data.buyerArea ?? null,
          totalOrders: 1,
          totalSpentPkr: totalPkr,
          lastOrderAt: new Date(),
          isRegular: false,
          isAtRisk: false,
        })
        .returning();
      buyerId = created.id;
    }

    const [order] = await db.insert(ordersTable).values({
      bakerId: parsed.data.bakerId,
      buyerId,
      buyerName: parsed.data.buyerName,
      buyerWhatsapp: phone,
      buyerAddress: parsed.data.buyerAddress,
      buyerArea: parsed.data.buyerArea ?? null,
      items: lineItems,
      totalPkr,
      deliveryDate: parsed.data.deliveryDate || null,
      fulfillmentType: parsed.data.fulfillmentType ?? "delivery",
      specialInstructions: parsed.data.specialInstructions ?? null,
      source: parsed.data.source?.trim() || "web_guest",
      status: "new",
      paymentStatus: "pending",
      requireAdvance: Boolean(baker.requireAdvance),
    }).returning();

    await logOrderActivity({
      orderId: order.id,
      bakerId: order.bakerId,
      actor: { actorType: "buyer" },
      action: "status_change",
      fromStatus: null,
      toStatus: "new",
      metadata: { source: order.source }
    });

    for (const item of lineItems.filter((item) => item.productId > 0)) {
      await db
        .update(productsTable)
        .set({ totalOrders: sql`${productsTable.totalOrders} + ${item.quantity}` })
        .where(eq(productsTable.id, item.productId));
    }
    await syncBakerStats(parsed.data.bakerId);
    void maybeSendAdvanceReminder(order.id);
    void sendN8nEvent("order.created", {
      bakerId: order.bakerId,
      orderId: order.id,
      totalPkr: order.totalPkr,
      buyerWhatsapp: order.buyerWhatsapp,
      source: order.source,
      requireAdvance: order.requireAdvance,
    });
    const guestToken = guestTokenFor(order, ["receipt"]);
    res.status(201).json({
      ...formatOrder(order),
      guestToken,
      guestUrl: guestOrderUrl({ orderId: order.id, bakerId: order.bakerId, scopes: ["receipt"], expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
    });
  } catch (cause) {
    console.error("Guest order create failed", cause);
    res.status(500).json({ error: "Could not place your order right now. Please try again." });
  }
});

// POST /orders/manual — records phone, walk-in, and social orders before a
// channel webhook is connected. The dashboard uses this for day-to-day work.
router.post("/orders/manual", requireBakerAuth, async (req, res): Promise<void> => {
  const parsed = ManualOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid order details." });
    return;
  }
  const bakerId = (req as AuthenticatedRequest).bakerId!;
  const data = parsed.data;
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!baker) {
    res.status(404).json({ error: "Bakery not found." });
    return;
  }

  const [existingCustomer] = await db.select().from(customersTable).where(and(
    eq(customersTable.bakerId, bakerId),
    eq(customersTable.whatsappNumber, data.buyerWhatsapp),
  ));
  const [customer] = existingCustomer
    ? await db.update(customersTable).set({
      name: data.buyerName,
      preferredArea: data.buyerArea,
      totalOrders: (existingCustomer.totalOrders ?? 0) + 1,
      totalSpentPkr: (existingCustomer.totalSpentPkr ?? 0) + data.totalPkr,
      isRegular: (existingCustomer.totalOrders ?? 0) + 1 >= 2,
      lastOrderAt: new Date(),
    }).where(eq(customersTable.id, existingCustomer.id)).returning()
    : await db.insert(customersTable).values({
      bakerId,
      name: data.buyerName,
      whatsappNumber: data.buyerWhatsapp,
      preferredArea: data.buyerArea,
      totalOrders: 1,
      totalSpentPkr: data.totalPkr,
      lastOrderAt: new Date(),
    }).returning();

  const [order] = await db.insert(ordersTable).values({
    bakerId,
    buyerId: customer.id,
    buyerName: data.buyerName,
    buyerWhatsapp: data.buyerWhatsapp,
    buyerAddress: data.buyerAddress,
    buyerArea: data.buyerArea,
    items: [{ productName: data.productName, quantity: data.quantity, unitPricePkr: Math.round(data.totalPkr / data.quantity) }],
    totalPkr: data.totalPkr,
    deliveryDate: data.deliveryDate,
    deliveryTimeSlot: data.deliveryTimeSlot,
    occasion: data.occasion,
    specialInstructions: data.specialInstructions,
    source: "manual",
    requireAdvance: baker.requireAdvance,
  }).returning();

  await logOrderActivity({
    orderId: order.id,
    bakerId: order.bakerId,
    actor: getActorFromRequest(req),
    action: "status_change",
    fromStatus: null,
    toStatus: "new",
    metadata: { source: "manual" }
  });

  await syncBakerStats(bakerId);
  res.status(201).json(formatOrder(order));
});

// POST /orders/custom-quote — public custom-cake request. It deliberately
// creates a zero-value request first; the baker chooses the price before it
// becomes a confirmed order.
router.post("/orders/custom-quote", rateLimit(10, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const parsed = CustomQuoteRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid custom-cake request." });
    return;
  }

  const data = parsed.data;
  const phone = normalizePakistanPhone(data.buyerWhatsapp);
  if (!phone) {
    res.status(400).json({ error: "Enter a valid Pakistani WhatsApp number, for example +92 300 1234567." });
    return;
  }

  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, data.bakerId)).limit(1);
  if (!baker || baker.marketplaceVisible === false) {
    res.status(404).json({ error: "Bakery not found." });
    return;
  }

  const [existingCustomer] = await db.select().from(customersTable).where(and(
    eq(customersTable.bakerId, baker.id),
    eq(customersTable.whatsappNumber, phone),
  ));
  const [customer] = existingCustomer
    ? await db.update(customersTable).set({ name: data.buyerName, preferredArea: data.buyerArea ?? null })
      .where(eq(customersTable.id, existingCustomer.id)).returning()
    : await db.insert(customersTable).values({
      bakerId: baker.id,
      name: data.buyerName,
      whatsappNumber: phone,
      preferredArea: data.buyerArea ?? null,
      totalOrders: 0,
      totalSpentPkr: 0,
    }).returning();

  const [order] = await db.insert(ordersTable).values({
    bakerId: baker.id,
    buyerId: customer.id,
    buyerName: data.buyerName,
    buyerWhatsapp: phone,
    buyerAddress: data.buyerAddress?.trim() || data.buyerArea?.trim() || "To be confirmed",
    buyerArea: data.buyerArea ?? null,
    items: [{
      productName: `Custom ${data.cakeType}`,
      quantity: 1,
      servings: data.servings,
      allergies: data.allergies || null,
      inspirationImageUrl: data.inspirationImageUrl || null,
    }],
    totalPkr: 0,
    deliveryDate: data.deliveryDate ?? null,
    occasion: data.occasion ?? null,
    flavour: data.flavour ?? null,
    specialInstructions: data.specialInstructions,
    source: "custom_quote",
    status: "new",
    paymentStatus: "pending",
    requireAdvance: Boolean(baker.requireAdvance),
  }).returning();

  await logOrderActivity({
    orderId: order.id,
    bakerId: order.bakerId,
    actor: { actorType: "buyer" },
    action: "status_change",
    fromStatus: null,
    toStatus: "new",
    metadata: { source: "custom_quote" }
  });

  void sendN8nEvent("custom_quote.requested", {
    bakerId: baker.id,
    orderId: order.id,
    buyerWhatsapp: phone,
    deliveryDate: order.deliveryDate,
  });
  const guestToken = guestTokenFor(order, ["quote", "receipt"]);
  res.status(201).json({
    ...formatOrder(order),
    guestToken,
    guestUrl: guestOrderUrl({ orderId: order.id, bakerId: order.bakerId, scopes: ["quote", "receipt"], expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
  });
});

// PATCH /orders/:orderId/quote — baker accepts a custom request and fixes the
// agreed price. Only this action counts it as a customer order in analytics.
router.patch("/orders/:orderId/quote", requireBakerAuth, async (req, res): Promise<void> => {
  const orderId = Number.parseInt(String(req.params.orderId), 10);
  const parsed = QuoteApprovalBody.safeParse(req.body);
  if (!Number.isInteger(orderId) || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid order ID." : parsed.error.issues[0]?.message ?? "Invalid quote." });
    return;
  }
  const bakerId = (req as AuthenticatedRequest).bakerId!;
  const [existing] = await db.select().from(ordersTable).where(and(
    eq(ordersTable.id, orderId),
    eq(ordersTable.bakerId, bakerId),
    eq(ordersTable.source, "custom_quote"),
  )).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Custom request not found." });
    return;
  }
  if (existing.totalPkr > 0 || existing.status !== "new") {
    res.status(409).json({ error: "This custom request has already been quoted." });
    return;
  }

  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId)).limit(1);
  if (!baker) {
    res.status(404).json({ error: "Bakery not found." });
    return;
  }
  const acceptedDeliveryDate = parsed.data.deliveryDate ?? existing.deliveryDate;
  const scheduleBlock = await getScheduleBlockReason(baker, acceptedDeliveryDate);
  if (scheduleBlock) {
    res.status(409).json({ error: scheduleBlock });
    return;
  }

  const depositRequiredPkr = baker.requireAdvance
    ? Math.ceil(parsed.data.totalPkr * Math.max(0, Math.min(100, baker.advancePercentage ?? 50)) / 100)
    : 0;
  const quoteExpiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);
  const [order] = await db.update(ordersTable).set({
    totalPkr: parsed.data.totalPkr,
    deliveryDate: parsed.data.deliveryDate ?? existing.deliveryDate,
    status: "quoted",
    depositRequiredPkr,
    quoteExpiresAt,
    customerApprovedAt: null,
    customerRejectedAt: null,
  }).where(and(
    eq(ordersTable.id, orderId),
    eq(ordersTable.status, "new"),
    eq(ordersTable.totalPkr, 0),
  )).returning();
  if (!order) {
    res.status(409).json({ error: "This custom request has already been quoted." });
    return;
  }

  await logOrderActivity({
    orderId: order.id,
    bakerId: order.bakerId,
    actor: getActorFromRequest(req),
    action: "status_change",
    fromStatus: "new",
    toStatus: "quoted",
    metadata: { totalPkr: order.totalPkr, prevTotalPkr: existing.totalPkr }
  });

  await db.insert(notificationsTable).values({
    bakerId,
    type: "quote.sent",
    title: `Quote ready for order #${order.id}`,
    message: `PKR ${order.totalPkr.toLocaleString()} quoted to ${order.buyerName}; waiting for customer acceptance.`,
    relatedId: order.id,
    relatedType: "order",
  });
  const guestAccessExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  void sendGuestActionLink({
    order,
    baker,
    scopes: ["quote", "receipt"],
    expiresAt: guestAccessExpiresAt,
    action: "quote",
    message: `Your quote from ${baker.businessName} is ready: PKR ${order.totalPkr.toLocaleString()}. Open the secure link to accept or decline.`,
  });
  void sendN8nEvent("custom_quote.sent", { bakerId, orderId: order.id, totalPkr: order.totalPkr, quoteExpiresAt });
  res.json(formatOrderForRole(order, (req as AuthenticatedRequest).memberRole));
});

router.patch("/orders/:orderId/quote-response", rateLimit(20, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const orderId = Number.parseInt(String(req.params.orderId), 10);
  const parsed = QuoteResponseBody.safeParse(req.body);
  if (!Number.isInteger(orderId) || !parsed.success) {
    res.status(400).json({ error: "Invalid secure quote response." });
    return;
  }
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing || existing.source !== "custom_quote" || !verifyGuestActionToken(parsed.data.token, { orderId, bakerId: existing.bakerId, scope: "quote" })) {
    res.status(404).json({ error: "This secure quote link is invalid or has expired." });
    return;
  }
  if (existing.status !== "quoted") {
    res.status(409).json({ error: "This quote is no longer waiting for a response." });
    return;
  }
  if (existing.quoteExpiresAt && existing.quoteExpiresAt.getTime() < Date.now()) {
    res.status(409).json({ error: "This quote has expired. Ask the bakery for an updated quote." });
    return;
  }

  const accepted = parsed.data.decision === "accept";
  const [order] = await db.update(ordersTable).set({
    status: accepted ? "confirmed" : "quote_rejected",
    customerApprovedAt: accepted ? new Date() : null,
    customerRejectedAt: accepted ? null : new Date(),
  }).where(and(eq(ordersTable.id, orderId), eq(ordersTable.status, "quoted"))).returning();
  if (!order) {
    res.status(409).json({ error: "This quote was already answered." });
    return;
  }

  if (accepted && existing.buyerId) {
    await db.update(customersTable).set({
      totalOrders: sql`${customersTable.totalOrders} + 1`,
      totalSpentPkr: sql`${customersTable.totalSpentPkr} + ${existing.totalPkr}`,
      isRegular: sql`${customersTable.totalOrders} + 1 >= 2`,
      lastOrderAt: new Date(),
    }).where(eq(customersTable.id, existing.buyerId));
  }
  await logOrderActivity({
    orderId: order.id,
    bakerId: order.bakerId,
    actor: { actorType: "buyer" },
    action: "status_change",
    fromStatus: "quoted",
    toStatus: order.status,
    metadata: { quoteDecision: parsed.data.decision },
  });
  await db.insert(notificationsTable).values({
    bakerId: order.bakerId,
    type: accepted ? "quote.accepted" : "quote.rejected",
    title: `Quote ${accepted ? "accepted" : "declined"} for order #${order.id}`,
    message: `${order.buyerName} ${accepted ? "accepted the quote. Review the deposit before production." : "declined the quote."}`,
    relatedId: order.id,
    relatedType: "order",
  });
  if (accepted) {
    await syncBakerStats(order.bakerId);
    void maybeSendAdvanceReminder(order.id);
  }
  void sendN8nEvent(accepted ? "custom_quote.accepted" : "custom_quote.rejected", { bakerId: order.bakerId, orderId: order.id });
  res.json({ id: order.id, status: order.status, paymentStatus: order.paymentStatus, depositRequiredPkr: order.depositRequiredPkr });
});

// POST /orders/:orderId/verify-payment
router.post("/orders/:orderId/verify-payment", requireBakerAuth, requireBakerOwner, async (req, res): Promise<void> => {
  const orderId = parseInt(String(req.params.orderId), 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const [order] = await db.select({ bakerId: ordersTable.bakerId }).from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.bakerId !== (req as AuthenticatedRequest).bakerId) {
    res.status(403).json({ error: "You can only verify your own orders." });
    return;
  }

  // Optional direct file upload (base64) — no Cloudinary / paid host required.
  const upload = z
    .object({
      imageBase64: z.string().min(32).max(6_000_000).optional(),
      contentType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
    })
    .safeParse(req.body ?? {});
  if (upload.success && upload.data.imageBase64) {
    const { toReceiptDataUrl } = await import("../lib/receipt-image.js");
    const raw = upload.data.imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Buffer.from(raw, "base64");
    const contentType = upload.data.contentType ?? "image/jpeg";
    let dataUrl: string;
    try {
      dataUrl = toReceiptDataUrl(bytes, contentType);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Invalid receipt image." });
      return;
    }
    await db
      .update(ordersTable)
      .set({ paymentScreenshotUrl: dataUrl })
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!)));

    await logOrderActivity({
      orderId,
      bakerId: order.bakerId,
      actor: getActorFromRequest(req),
      action: "receipt_upload",
      metadata: { method: "direct_upload" }
    });
  }

  try {
    const result = await triggerPaymentOCRVerification(orderId);
    if (!result) {
      res.status(400).json({
        error: "Upload a receipt image (or paste an HTTPS URL) first, then check again.",
      });
      return;
    }

    await logOrderActivity({
      orderId,
      bakerId: order.bakerId,
      actor: getActorFromRequest(req),
      action: "ocr_verification",
      metadata: {
        verified: result.verified,
        amountMatches: result.amountMatches,
        recipientMatches: result.recipientMatches,
        extractedAmount: result.extractedAmount,
        extractedTrxId: result.extractedTrxId,
        confidence: result.confidence,
        decision: result.decision
      }
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Receipt check failed." });
  }
});

// GET /orders/:orderId
router.get("/orders/:orderId", requireBakerAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.bakerId !== (req as AuthenticatedRequest).bakerId) {
    res.status(403).json({ error: "You can only access your own orders." });
    return;
  }
  res.json(formatOrderForRole(order, (req as AuthenticatedRequest).memberRole));
});

// PATCH /orders/:orderId/status
router.patch("/orders/:orderId/status", requireBakerAuth, async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const isCancelled = parsed.data.status === "cancelled";
  const isDelivered = parsed.data.status === "delivered";
  const [existingOrder] = await db
    .select({ status: ordersTable.status, source: ordersTable.source, customerApprovedAt: ordersTable.customerApprovedAt })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, params.data.orderId), eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!)))
    .limit(1);
  if (!existingOrder) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (existingOrder.source === "custom_quote" && existingOrder.status === "quoted" && parsed.data.status !== "cancelled") {
    res.status(409).json({ error: "The customer must accept this quote before production can begin." });
    return;
  }

  const [order] = await db.update(ordersTable)
    .set({
      status: parsed.data.status,
      cancellationReason: isCancelled ? parsed.data.cancellationReason?.trim() || "Not specified" : null,
      cancelledBy: isCancelled ? parsed.data.cancelledBy?.trim() || "baker" : null,
      cancelledAt: isCancelled ? new Date() : null,
      deliveredAt: isDelivered ? new Date() : undefined,
      feedbackRequestedAt: isDelivered ? new Date() : undefined,
    })
    .where(and(eq(ordersTable.id, params.data.orderId), eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!)))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await logOrderActivity({
    orderId: order.id,
    bakerId: order.bakerId,
    actor: getActorFromRequest(req),
    action: "status_change",
    fromStatus: existingOrder?.status ?? null,
    toStatus: order.status,
    metadata: isCancelled ? { reason: order.cancellationReason, cancelledBy: order.cancelledBy } : {}
  });

  if (isDelivered) {
    const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, order.bakerId)).limit(1);
    if (baker) {
      sendDeliveryFeedbackRequest(order, baker).catch((err) =>
        console.error("Feedback WhatsApp failed", err),
      );
    }
  } else {
    const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, order.bakerId)).limit(1);
    if (baker) {
      sendOrderStatusUpdate(order, baker).catch((err) =>
        console.error("Order-status WhatsApp failed", err),
      );
    }
  }

  res.json(formatOrder(order));
});

// PATCH /orders/:orderId/dispatch â€” stores the delivery window and rider so
// every staff member sees the same operational plan in the live order record.
router.patch("/orders/:orderId/dispatch", requireBakerAuth, async (req, res): Promise<void> => {
  const orderId = Number.parseInt(String(req.params.orderId), 10);
  const parsed = DispatchOrderBody.safeParse(req.body);
  if (!Number.isInteger(orderId) || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid order ID." : parsed.error.issues[0]?.message ?? "Invalid dispatch details." });
    return;
  }
  const [order] = await db.update(ordersTable).set({
    deliveryTimeSlot: parsed.data.deliveryTimeSlot?.trim() || null,
    riderName: parsed.data.riderName?.trim() || null,
    riderPhone: parsed.data.riderPhone?.trim() || null,
  }).where(and(
    eq(ordersTable.id, orderId),
    eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!),
  )).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json(formatOrder(order));
});

// PATCH /orders/:orderId/refund â€” owner-only financial audit trail. This
// records a refund; it does not claim to move money through a payment gateway.
router.patch("/orders/:orderId/refund", requireBakerAuth, requireBakerOwner, async (req, res): Promise<void> => {
  const orderId = Number.parseInt(String(req.params.orderId), 10);
  const parsed = RefundOrderBody.safeParse(req.body);
  if (!Number.isInteger(orderId) || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid order ID." : parsed.error.issues[0]?.message ?? "Invalid refund details." });
    return;
  }
  const [order] = await db.update(ordersTable).set({
    refundStatus: parsed.data.amountPkr > 0 ? "refunded" : "no_refund",
    refundAmountPkr: parsed.data.amountPkr,
    refundReason: parsed.data.reason,
    refundedAt: new Date(),
  }).where(and(
    eq(ordersTable.id, orderId),
    eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!),
  )).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }

  await logOrderActivity({
    orderId: order.id,
    bakerId: order.bakerId,
    actor: getActorFromRequest(req),
    action: "refund",
    metadata: {
      amountPkr: order.refundAmountPkr,
      reason: order.refundReason,
      refundStatus: order.refundStatus
    }
  });
  void sendN8nEvent("order.refund_recorded", {
    bakerId: order.bakerId,
    orderId: order.id,
    amountPkr: order.refundAmountPkr,
    reason: order.refundReason,
  });
  res.json(formatOrder(order));
});

// POST /orders/:orderId/feedback — buyer rates service after delivery
router.post("/orders/:orderId/feedback", rateLimit(20, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const orderId = parseInt(String(req.params.orderId), 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const parsed = z.object({
    feedback: z.enum(["loved_it", "okay", "had_issue"]),
    note: z.string().trim().max(500).optional(),
    token: z.string().trim().min(40),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order || !verifyGuestActionToken(parsed.data.token, { orderId, bakerId: order.bakerId, scope: "feedback" })) {
    res.status(404).json({ error: "This feedback link is invalid or has expired." });
    return;
  }
  const updated = await recordOrderFeedback({
    orderId,
    feedback: parsed.data.feedback as ServiceFeedback,
    note: parsed.data.note,
    buyerWhatsapp: order.buyerWhatsapp,
  });
  if (!updated) {
    res.status(404).json({ error: "Order not found or feedback already submitted." });
    return;
  }
  res.json({ ok: true, message: "Thank you for your feedback!" });
});

// GET /orders/:orderId/feedback — public status for feedback page
router.get("/orders/:orderId/feedback", rateLimit(40, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const orderId = parseInt(String(req.params.orderId), 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  const token = String(req.header("x-guest-token") ?? "");
  if (!order || order.status !== "delivered" || !verifyGuestActionToken(token, { orderId, bakerId: order.bakerId, scope: "feedback" })) {
    res.status(404).json({ error: "Order not ready for feedback." });
    return;
  }
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, order.bakerId)).limit(1);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    orderId: order.id,
    bakerName: baker?.businessName ?? "Bakery",
    buyerName: order.buyerName,
    alreadySubmitted: !!order.serviceFeedback,
    serviceFeedback: order.serviceFeedback,
  });
});

/**
 * Guest buyer uploads JazzCash/Easypaisa receipt using an expiring signed link.
 * Does not mark paid — baker reviews in Payments.
 */
router.post("/orders/:orderId/guest-receipt", rateLimit(20, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const orderId = parseInt(String(req.params.orderId), 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const parsed = z
    .object({
      token: z.string().trim().min(40),
      imageBase64: z.string().min(32).max(6_000_000),
      contentType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order || !verifyGuestActionToken(parsed.data.token, { orderId, bakerId: order.bakerId, scope: "receipt" })) {
    res.status(404).json({ error: "This receipt-upload link is invalid or has expired." });
    return;
  }
  if (order.paymentStatus === "paid") {
    res.status(400).json({ error: "This order is already marked paid." });
    return;
  }

  const raw = parsed.data.imageBase64.replace(/^data:image\/\w+;base64,/, "");
  let dataUrl: string;
  try {
    dataUrl = toReceiptDataUrl(Buffer.from(raw, "base64"), parsed.data.contentType ?? "image/jpeg");
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid receipt image." });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ paymentScreenshotUrl: dataUrl })
    .where(eq(ordersTable.id, orderId))
    .returning();

  await logOrderActivity({
    orderId: updated.id,
    bakerId: updated.bakerId,
    actor: { actorType: "buyer" },
    action: "receipt_upload",
    metadata: { method: "guest_receipt_upload" }
  });

  await db.insert(notificationsTable).values({
    bakerId: order.bakerId,
    type: "payment.receipt_uploaded",
    title: `Receipt for order #${order.id}`,
    message: `${order.buyerName} uploaded a payment screenshot. Review it in Payments.`,
    relatedId: order.id,
    relatedType: "order",
  });

  res.json({
    ok: true,
    orderId: updated.id,
    message: "Receipt uploaded. The bakery will confirm payment shortly.",
  });
});

// PATCH /orders/:orderId/payment
router.patch("/orders/:orderId/payment", requireBakerAuth, requireBakerOwner, async (req, res): Promise<void> => {
  const params = MarkOrderPaidParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = MarkOrderPaidBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db.update(ordersTable)
    .set({ paymentStatus: "paid", advancePaid: true, paymentAmountReceived: parsed.data.amountReceived })
    .where(and(eq(ordersTable.id, params.data.orderId), eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!)))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await logOrderActivity({
    orderId: order.id,
    bakerId: order.bakerId,
    actor: getActorFromRequest(req),
    action: "payment_decision",
    fromStatus: "pending",
    toStatus: "paid",
    metadata: { amountReceived: order.paymentAmountReceived }
  });
  res.json(formatOrder(order));
});

// PATCH /orders/:orderId/payment-screenshot — set receipt image URL for advisory OCR (does not mark paid)
router.patch("/orders/:orderId/payment-screenshot", requireBakerAuth, requireBakerOwner, async (req, res): Promise<void> => {
  const orderId = parseInt(String(req.params.orderId), 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const parsed = z.object({
    paymentScreenshotUrl: z.string().min(12).refine(
      (value) => {
        if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)) return true;
        try {
          return new URL(value).protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "paymentScreenshotUrl must be https or a data:image URL" },
    ),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db.update(ordersTable)
    .set({ paymentScreenshotUrl: parsed.data.paymentScreenshotUrl })
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!)))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await logOrderActivity({
    orderId: order.id,
    bakerId: order.bakerId,
    actor: getActorFromRequest(req),
    action: "receipt_upload",
    metadata: { method: "manual_screenshot_url" }
  });
  res.json(formatOrder(order));
});

export default router;
