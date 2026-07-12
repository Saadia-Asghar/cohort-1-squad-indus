import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import {
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  MarkOrderPaidParams,
  MarkOrderPaidBody,
  CreateOrderBody,
  ListOrdersQueryParams,
} from "@workspace/api-zod";
import { triggerPaymentOCRVerification } from "../lib/ocr";

const router: IRouter = Router();

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return { ...o, items: (o.items as unknown[]) ?? [] };
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
  const [order] = await db.insert(ordersTable).values(parsed.data as any).returning();
  
  // Auto-trigger OCR verification if a payment screenshot URL is provided on checkout
  if (parsed.data.paymentScreenshotUrl) {
    triggerPaymentOCRVerification(order.id).catch((err) =>
      console.error("Auto-OCR payment verification failed asynchronously:", err)
    );
  }

  res.status(201).json(formatOrder(order));
});

// POST /orders/:orderId/verify-payment
router.post("/orders/:orderId/verify-payment", async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.orderId, 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
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
router.get("/orders/:orderId", async (req, res): Promise<void> => {
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
  res.json(formatOrder(order));
});

// PATCH /orders/:orderId/status
router.patch("/orders/:orderId/status", async (req, res): Promise<void> => {
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
  const [order] = await db.update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, params.data.orderId))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(order));
});

// PATCH /orders/:orderId/payment
router.patch("/orders/:orderId/payment", async (req, res): Promise<void> => {
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
    .where(eq(ordersTable.id, params.data.orderId))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(order));
});

export default router;
