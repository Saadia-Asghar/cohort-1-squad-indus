import { Router } from "express";
import { eq, and, inArray, sql } from "drizzle-orm";
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
import { AuthenticatedRequest, requireBakerAuth } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rate-limiter.js";
import { normalizePakistanPhone } from "../lib/phone.js";
import {
  recordOrderFeedback,
  sendDeliveryFeedbackRequest,
  type ServiceFeedback,
} from "../lib/order-feedback.js";
import { maybeSendAdvanceReminder } from "../lib/advance-reminder.js";
import { syncBakerStats } from "../lib/seed-baker-demo.js";
import { sendN8nEvent } from "../lib/n8n.js";
import { isOrderCapReached } from "../lib/plan-limits.js";
import { toReceiptDataUrl } from "../lib/receipt-image.js";

const router = Router();

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return { ...o, items: (o.items as unknown[]) ?? [] };
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
  deliveryDate: z.string().optional(),
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
  res.json(orders.map(formatOrder));
});

// GET /orders/lookup?phone= — buyer self-serve status (no payment details)
router.get("/orders/lookup", rateLimit(20, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const phoneRaw = String(req.query.phone ?? "");
  const normalized = normalizePakistanPhone(phoneRaw);
  if (!normalized) {
    res.status(400).json({ error: "Enter a valid Pakistani WhatsApp number." });
    return;
  }
  const digits = normalized.replace(/\D/g, "");
  const variants = Array.from(new Set([
    normalized,
    digits,
    digits.startsWith("92") ? `0${digits.slice(2)}` : digits,
    `+${digits}`,
  ]));
  const orders = await db
    .select({
      id: ordersTable.id,
      bakerId: ordersTable.bakerId,
      status: ordersTable.status,
      paymentStatus: ordersTable.paymentStatus,
      totalPkr: ordersTable.totalPkr,
      deliveryDate: ordersTable.deliveryDate,
      createdAt: ordersTable.createdAt,
      items: ordersTable.items,
    })
    .from(ordersTable)
    .where(inArray(ordersTable.buyerWhatsapp, variants))
    .limit(20);
  res.json(orders.map((o) => ({ ...o, items: (o.items as unknown[]) ?? [] })));
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

  const totalPkr = lineItems.reduce((sum, item) => sum + item.unitPricePkr * item.quantity, 0);

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

    for (const item of lineItems) {
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
    res.status(201).json(formatOrder(order));
  } catch (cause) {
    console.error("Guest order create failed", cause);
    res.status(500).json({ error: "Could not place your order right now. Please try again." });
  }
});

// POST /orders/:orderId/verify-payment
router.post("/orders/:orderId/verify-payment", requireBakerAuth, async (req, res): Promise<void> => {
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
  }

  try {
    const result = await triggerPaymentOCRVerification(orderId);
    if (!result) {
      res.status(400).json({
        error: "Upload a receipt image (or paste an HTTPS URL) first, then check again.",
      });
      return;
    }
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
  res.json(formatOrder(order));
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

  if (isDelivered) {
    const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, order.bakerId)).limit(1);
    if (baker) {
      sendDeliveryFeedbackRequest(order, baker).catch((err) =>
        console.error("Feedback WhatsApp failed", err),
      );
    }
  }

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
    buyerWhatsapp: z.string().trim().min(10).max(24),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const phone = normalizePakistanPhone(parsed.data.buyerWhatsapp);
  if (!phone) {
    res.status(400).json({ error: "Invalid WhatsApp number." });
    return;
  }
  const updated = await recordOrderFeedback({
    orderId,
    feedback: parsed.data.feedback as ServiceFeedback,
    note: parsed.data.note,
    buyerWhatsapp: phone,
  });
  if (!updated) {
    res.status(404).json({ error: "Order not found or feedback already submitted." });
    return;
  }
  res.json({ ok: true, message: "Thank you for your feedback!" });
});

// GET /orders/:orderId/feedback — public status for feedback page
router.get("/orders/:orderId/feedback", async (req, res): Promise<void> => {
  const orderId = parseInt(String(req.params.orderId), 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order || order.status !== "delivered") {
    res.status(404).json({ error: "Order not ready for feedback." });
    return;
  }
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, order.bakerId)).limit(1);
  res.json({
    orderId: order.id,
    bakerName: baker?.businessName ?? "Bakery",
    buyerName: order.buyerName,
    alreadySubmitted: !!order.serviceFeedback,
    serviceFeedback: order.serviceFeedback,
  });
});

/**
 * Guest buyer uploads JazzCash/Easypaisa receipt after checkout (phone must match order).
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
      buyerWhatsapp: z.string().trim().min(10).max(24),
      imageBase64: z.string().min(32).max(6_000_000),
      contentType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const phone = normalizePakistanPhone(parsed.data.buyerWhatsapp);
  if (!phone) {
    res.status(400).json({ error: "Enter a valid Pakistani WhatsApp number." });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const orderPhone = normalizePakistanPhone(order.buyerWhatsapp);
  if (!orderPhone || orderPhone !== phone) {
    res.status(403).json({ error: "WhatsApp number does not match this order." });
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
router.patch("/orders/:orderId/payment", requireBakerAuth, async (req, res): Promise<void> => {
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
  res.json(formatOrder(order));
});

// PATCH /orders/:orderId/payment-screenshot — set receipt image URL for advisory OCR (does not mark paid)
router.patch("/orders/:orderId/payment-screenshot", requireBakerAuth, async (req, res): Promise<void> => {
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
  res.json(formatOrder(order));
});

export default router;
