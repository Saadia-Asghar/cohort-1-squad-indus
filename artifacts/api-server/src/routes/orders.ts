import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, customersTable, ordersTable, productsTable } from "@workspace/db";
import {
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  MarkOrderPaidParams,
  MarkOrderPaidBody,
  CreateOrderBody,
  ListOrdersQueryParams,
} from "@workspace/api-zod";
import { triggerPaymentOCRVerification } from "../lib/ocr.js";
import { AuthenticatedRequest, requireBakerAuth } from "../middlewares/auth.js";

const router = Router();

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return { ...o, items: (o.items as unknown[]) ?? [] };
}

function calculateOrderItems(
  requestedItems: Array<{ productId: number; quantity: number; sizeLabel: string; variant?: string | null }>,
  products: Array<typeof productsTable.$inferSelect>,
) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return requestedItems.map((requested) => {
    const product = byId.get(requested.productId);
    if (!product || !product.isAvailable) throw new Error("One or more selected products are unavailable.");
    const sizes = (product.sizes as Array<{ label: string; pricePkr: number }>) ?? [];
    const selectedSize = sizes.find((size) => size.label === requested.sizeLabel);
    if (sizes.length > 0 && !selectedSize) throw new Error(`Choose a valid size for ${product.name}.`);
    const unitPricePkr = selectedSize?.pricePkr ?? product.basePricePkr;
    return {
      productId: product.id,
      productName: product.name,
      quantity: requested.quantity,
      unitPricePkr,
      sizeLabel: requested.sizeLabel,
      variant: requested.variant ?? null,
    };
  });
}

// GET /orders
router.get("/orders", async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  let dbQuery = db.select().from(ordersTable).$dynamic();
  if (query.data.bakerId) dbQuery = dbQuery.where(eq(ordersTable.bakerId, query.data.bakerId));
  if (query.data.buyerId) dbQuery = dbQuery.where(eq(ordersTable.buyerId, query.data.buyerId));
  if (query.data.status) dbQuery = dbQuery.where(eq(ordersTable.status, query.data.status));
  const orders = await dbQuery;
  res.json(orders.map(formatOrder));
});

// POST /orders
router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
  const products = await db.select().from(productsTable).where(
    and(eq(productsTable.bakerId, parsed.data.bakerId), inArray(productsTable.id, productIds)),
  );
  let trustedItems;
  try {
    trustedItems = calculateOrderItems(parsed.data.items, products);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid order items." });
    return;
  }
  if (trustedItems.length !== parsed.data.items.length) {
    res.status(400).json({ error: "Some selected products do not belong to this bakery." });
    return;
  }
  const trustedTotalPkr = trustedItems.reduce((total, item) => total + item.quantity * item.unitPricePkr, 0);
  const phone = parsed.data.buyerWhatsapp.replace(/\s+/g, "").trim();
  const [existingCustomer] = await db.select().from(customersTable)
    .where(and(eq(customersTable.bakerId, parsed.data.bakerId), eq(customersTable.whatsappNumber, phone)));

  const customer = existingCustomer
    ? (await db.update(customersTable)
      .set({
        name: parsed.data.buyerName.trim(),
        preferredArea: parsed.data.buyerArea?.trim() || existingCustomer.preferredArea,
        totalOrders: existingCustomer.totalOrders + 1,
        totalSpentPkr: existingCustomer.totalSpentPkr + trustedTotalPkr,
        isRegular: existingCustomer.totalOrders + 1 >= 2,
        lastOrderAt: new Date(),
      })
      .where(eq(customersTable.id, existingCustomer.id))
      .returning())[0]
    : (await db.insert(customersTable).values({
        bakerId: parsed.data.bakerId,
        name: parsed.data.buyerName.trim(),
        whatsappNumber: phone,
        preferredArea: parsed.data.buyerArea?.trim() || null,
        totalOrders: 1,
        totalSpentPkr: trustedTotalPkr,
        isRegular: false,
        lastOrderAt: new Date(),
      }).returning())[0];

  const [order] = await db.insert(ordersTable).values({
    ...parsed.data,
    items: trustedItems,
    totalPkr: trustedTotalPkr,
    buyerId: customer.id,
    buyerWhatsapp: phone,
  } as any).returning();
  
  // Auto-trigger OCR verification if a payment screenshot URL is provided on checkout
  if (parsed.data.paymentScreenshotUrl) {
    triggerPaymentOCRVerification(order.id).catch((err) =>
      console.error("Auto-OCR payment verification failed asynchronously:", err)
    );
  }

  res.status(201).json(formatOrder(order));
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
  const result = await triggerPaymentOCRVerification(orderId);
  if (!result) {
    res.status(400).json({ error: "No screenshot URL found on this order or verification failed." });
    return;
  }
  res.json(result);
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
  const [order] = await db.update(ordersTable)
    .set({
      status: parsed.data.status,
      cancellationReason: isCancelled ? parsed.data.cancellationReason?.trim() || "Not specified" : null,
      cancelledBy: isCancelled ? parsed.data.cancelledBy?.trim() || "baker" : null,
      cancelledAt: isCancelled ? new Date() : null,
    })
    .where(and(eq(ordersTable.id, params.data.orderId), eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!)))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(order));
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
    .set({ paymentStatus: "paid", paymentAmountReceived: parsed.data.amountReceived })
    .where(and(eq(ordersTable.id, params.data.orderId), eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!)))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(order));
});

export default router;
