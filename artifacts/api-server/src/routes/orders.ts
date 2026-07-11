import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import {
  CreateOrderBody,
  UpdateOrderBody,
  BulkCreateOrdersBody,
  ListOrdersQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/orders", async (req, res): Promise<void> => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  const limitVal = parsed.success && parsed.data.limit ? parsed.data.limit : 100;
  const sortVal = parsed.success && parsed.data.sort ? parsed.data.sort : "-created_at";

  const orderBy = sortVal.startsWith("-")
    ? desc(ordersTable.createdAt)
    : asc(ordersTable.createdAt);

  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(orderBy)
    .limit(limitVal);

  res.json(orders);
});

router.post("/orders/bulk", async (req, res): Promise<void> => {
  const parsed = BulkCreateOrdersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ordersData = parsed.data.orders.map((o) => ({
    customerName: o.customerName,
    customerPhone: o.customerPhone ?? null,
    cakeType: o.cakeType,
    flavor: o.flavor ?? null,
    weight: o.weight ?? null,
    designNotes: o.designNotes ?? null,
    deliveryDate: o.deliveryDate ?? null,
    deliveryTime: o.deliveryTime ?? null,
    deliveryType: o.deliveryType ?? "delivery",
    price: o.price ?? 0,
    paymentStatus: o.paymentStatus ?? "pending",
    status: o.status ?? "confirmed",
    specialRequests: o.specialRequests ?? null,
    notes: o.notes ?? null,
    source: o.source ?? "manual",
    confidence: o.confidence ?? null,
  }));

  const created = await db.insert(ordersTable).values(ordersData).returning();
  res.status(201).json(created);
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [order] = await db
    .insert(ordersTable)
    .values({
      customerName: data.customerName,
      customerPhone: data.customerPhone ?? null,
      cakeType: data.cakeType,
      flavor: data.flavor ?? null,
      weight: data.weight ?? null,
      designNotes: data.designNotes ?? null,
      deliveryDate: data.deliveryDate ?? null,
      deliveryTime: data.deliveryTime ?? null,
      deliveryType: data.deliveryType ?? "delivery",
      price: data.price ?? 0,
      paymentStatus: data.paymentStatus ?? "pending",
      status: data.status ?? "confirmed",
      specialRequests: data.specialRequests ?? null,
      notes: data.notes ?? null,
      source: data.source ?? "manual",
      confidence: data.confidence ?? null,
    })
    .returning();

  res.status(201).json(order);
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const parsed = UpdateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (data.customerName !== undefined) updateData.customerName = data.customerName;
  if (data.customerPhone !== undefined) updateData.customerPhone = data.customerPhone;
  if (data.cakeType !== undefined) updateData.cakeType = data.cakeType;
  if (data.flavor !== undefined) updateData.flavor = data.flavor;
  if (data.weight !== undefined) updateData.weight = data.weight;
  if (data.designNotes !== undefined) updateData.designNotes = data.designNotes;
  if (data.deliveryDate !== undefined) updateData.deliveryDate = data.deliveryDate;
  if (data.deliveryTime !== undefined) updateData.deliveryTime = data.deliveryTime;
  if (data.deliveryType !== undefined) updateData.deliveryType = data.deliveryType;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.specialRequests !== undefined) updateData.specialRequests = data.specialRequests;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.source !== undefined) updateData.source = data.source;
  if (data.confidence !== undefined) updateData.confidence = data.confidence;

  const [order] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const [order] = await db
    .delete(ordersTable)
    .where(eq(ordersTable.id, id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
