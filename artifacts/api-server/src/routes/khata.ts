import { Router } from "express";
import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db, inventoryItemsTable, ledgerEntriesTable, ordersTable, productsTable } from "@workspace/db";
import { z } from "zod/v4";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";
import { resolveKhataDateRange } from "../lib/khata-period.js";

const router = Router();

const bakerParamSchema = z.object({ bakerId: z.coerce.number().int().positive() });
const inventoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(24).default("pcs"),
  qtyInStock: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  unitCostPkr: z.coerce.number().int().min(0).default(0),
});
const inventoryUpdateSchema = inventoryCreateSchema.partial();
const ledgerCreateSchema = z.object({
  type: z.enum(["expense", "delivery_cost", "sale_adjustment"]).default("expense"),
  category: z.string().trim().min(1).max(50).default("general"),
  description: z.string().trim().max(240).optional(),
  amountPkr: z.coerce.number().int().min(0),
  entryDate: z.string().date(),
});

type OrderLineItem = {
  productId?: number;
  productName?: string;
  quantity?: number;
  unitPricePkr?: number;
};

async function computeProductMargins(
  bakerId: number,
  startDate: string,
  endDate: string,
): Promise<Array<{
  productId: number;
  productName: string;
  unitsSold: number;
  revenuePkr: number;
  recipeCostPkr: number | null;
  estimatedCogsPkr: number;
  marginPkr: number;
  marginPercent: number | null;
}>> {
  const productRows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      basePricePkr: productsTable.basePricePkr,
      recipeCostPkr: productsTable.recipeCostPkr,
    })
    .from(productsTable)
    .where(eq(productsTable.bakerId, bakerId));

  const productMap = new Map(productRows.map((p) => [p.id, p]));
  const agg = new Map<number, { units: number; revenue: number }>();

  const orderRows = await db
    .select({ items: ordersTable.items })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.bakerId, bakerId),
        gte(sql`date(${ordersTable.createdAt})`, startDate),
        lte(sql`date(${ordersTable.createdAt})`, endDate),
        ne(ordersTable.status, "cancelled"),
      ),
    );

  for (const row of orderRows) {
    const items = (row.items as OrderLineItem[]) ?? [];
    for (const item of items) {
      const pid = item.productId;
      if (!pid) continue;
      const qty = item.quantity ?? 1;
      const lineRevenue = (item.unitPricePkr ?? 0) * qty;
      const existing = agg.get(pid) ?? { units: 0, revenue: 0 };
      agg.set(pid, { units: existing.units + qty, revenue: existing.revenue + lineRevenue });
    }
  }

  const margins: Array<{
    productId: number;
    productName: string;
    unitsSold: number;
    revenuePkr: number;
    recipeCostPkr: number | null;
    estimatedCogsPkr: number;
    marginPkr: number;
    marginPercent: number | null;
  }> = [];

  for (const [productId, stats] of agg) {
    const product = productMap.get(productId);
    const recipeCost = product?.recipeCostPkr ?? null;
    const estimatedCogs = recipeCost != null ? recipeCost * stats.units : 0;
    const marginPkr = stats.revenue - estimatedCogs;
    margins.push({
      productId,
      productName: product?.name ?? `Product #${productId}`,
      unitsSold: stats.units,
      revenuePkr: stats.revenue,
      recipeCostPkr: recipeCost,
      estimatedCogsPkr: estimatedCogs,
      marginPkr,
      marginPercent: stats.revenue > 0 ? Math.round((marginPkr / stats.revenue) * 1000) / 10 : null,
    });
  }

  return margins.sort((a, b) => b.revenuePkr - a.revenuePkr);
}

// GET /inventory/baker/:bakerId
router.get("/inventory/baker/:bakerId", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const parsed = bakerParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const items = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.bakerId, parsed.data.bakerId))
    .orderBy(inventoryItemsTable.name);
  res.json(items);
});

// POST /inventory/baker/:bakerId/items
router.post("/inventory/baker/:bakerId/items", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = bakerParamSchema.safeParse(req.params);
  const body = inventoryCreateSchema.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [item] = await db.insert(inventoryItemsTable).values({
    bakerId: params.data.bakerId,
    ...body.data,
  }).returning();
  res.status(201).json(item);
});

// PATCH /inventory/baker/:bakerId/items/:itemId
router.patch("/inventory/baker/:bakerId/items/:itemId", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = z.object({ bakerId: z.coerce.number().int().positive(), itemId: z.coerce.number().int().positive() }).safeParse(req.params);
  const body = inventoryUpdateSchema.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const payload = body.data;
  if (Object.keys(payload).length === 0) {
    res.status(400).json({ error: "No fields provided." });
    return;
  }
  const [updated] = await db
    .update(inventoryItemsTable)
    .set(payload)
    .where(and(eq(inventoryItemsTable.id, params.data.itemId), eq(inventoryItemsTable.bakerId, params.data.bakerId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Inventory item not found." });
    return;
  }
  res.json(updated);
});

// DELETE /inventory/baker/:bakerId/items/:itemId
router.delete("/inventory/baker/:bakerId/items/:itemId", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = z.object({ bakerId: z.coerce.number().int().positive(), itemId: z.coerce.number().int().positive() }).safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(inventoryItemsTable)
    .where(and(eq(inventoryItemsTable.id, params.data.itemId), eq(inventoryItemsTable.bakerId, params.data.bakerId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Inventory item not found." });
    return;
  }
  res.json({ ok: true, id: deleted.id });
});

// GET /ledger/baker/:bakerId/entries
router.get("/ledger/baker/:bakerId/entries", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const parsed = bakerParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;

  const conditions = [eq(ledgerEntriesTable.bakerId, parsed.data.bakerId)];
  if (startDate) conditions.push(gte(ledgerEntriesTable.entryDate, startDate));
  if (endDate) conditions.push(lte(ledgerEntriesTable.entryDate, endDate));

  const rows = await db
    .select()
    .from(ledgerEntriesTable)
    .where(and(...conditions))
    .orderBy(desc(ledgerEntriesTable.entryDate), desc(ledgerEntriesTable.id))
    .limit(200);
  res.json(rows);
});

// POST /ledger/baker/:bakerId/entries
router.post("/ledger/baker/:bakerId/entries", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = bakerParamSchema.safeParse(req.params);
  const body = ledgerCreateSchema.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [entry] = await db.insert(ledgerEntriesTable).values({
    bakerId: params.data.bakerId,
    ...body.data,
  }).returning();
  res.status(201).json(entry);
});

// DELETE /ledger/baker/:bakerId/entries/:entryId
router.delete("/ledger/baker/:bakerId/entries/:entryId", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = z.object({
    bakerId: z.coerce.number().int().positive(),
    entryId: z.coerce.number().int().positive(),
  }).safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(ledgerEntriesTable)
    .where(and(eq(ledgerEntriesTable.id, params.data.entryId), eq(ledgerEntriesTable.bakerId, params.data.bakerId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Ledger entry not found." });
    return;
  }
  res.json({ ok: true, id: deleted.id });
});

// GET /analytics/baker/:bakerId/khata/months
router.get("/analytics/baker/:bakerId/khata/months", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = bakerParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const bakerId = params.data.bakerId;

  const orderMonths = await db
    .select({
      month: sql<string>`to_char(date(${ordersTable.createdAt}), 'YYYY-MM')`,
      revenue: sql<number>`coalesce(sum(${ordersTable.totalPkr}), 0)::int`,
      orders: sql<number>`coalesce(count(*), 0)::int`,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.bakerId, bakerId), ne(ordersTable.status, "cancelled")))
    .groupBy(sql`to_char(date(${ordersTable.createdAt}), 'YYYY-MM')`);

  const expenseMonths = await db
    .select({
      month: sql<string>`to_char(${ledgerEntriesTable.entryDate}::date, 'YYYY-MM')`,
      expenses: sql<number>`coalesce(sum(${ledgerEntriesTable.amountPkr}), 0)::int`,
    })
    .from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.bakerId, bakerId))
    .groupBy(sql`to_char(${ledgerEntriesTable.entryDate}::date, 'YYYY-MM')`);

  const byMonth = new Map<string, { month: string; revenue: number; orders: number; expenses: number; profit: number }>();

  for (const row of orderMonths) {
    byMonth.set(row.month, {
      month: row.month,
      revenue: row.revenue,
      orders: row.orders,
      expenses: 0,
      profit: row.revenue,
    });
  }
  for (const row of expenseMonths) {
    const existing = byMonth.get(row.month) ?? { month: row.month, revenue: 0, orders: 0, expenses: 0, profit: 0 };
    existing.expenses = row.expenses;
    existing.profit = existing.revenue - existing.expenses;
    byMonth.set(row.month, existing);
  }

  const months = [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
  res.json(months);
});

// GET /analytics/baker/:bakerId/khata?period=daily|weekly|monthly|yearly&month=YYYY-MM&year=YYYY
router.get("/analytics/baker/:bakerId/khata", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = bakerParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const range = resolveKhataDateRange({
    period: typeof req.query.period === "string" ? req.query.period : undefined,
    month: typeof req.query.month === "string" ? req.query.month : undefined,
    year: typeof req.query.year === "string" ? req.query.year : undefined,
  });

  const bakerId = params.data.bakerId;
  const { startDate, endDate } = range;

  const [sales] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${ordersTable.totalPkr}), 0)::int`,
      orders: sql<number>`coalesce(count(*), 0)::int`,
      deliveredOrders: sql<number>`coalesce(sum(case when ${ordersTable.status} = 'delivered' then 1 else 0 end), 0)::int`,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.bakerId, bakerId),
        gte(sql`date(${ordersTable.createdAt})`, startDate),
        lte(sql`date(${ordersTable.createdAt})`, endDate),
        ne(ordersTable.status, "cancelled"),
      ),
    );

  const [expenses] = await db
    .select({
      totalExpenses: sql<number>`coalesce(sum(${ledgerEntriesTable.amountPkr}), 0)::int`,
      deliveryCosts: sql<number>`coalesce(sum(case when ${ledgerEntriesTable.type} = 'delivery_cost' then ${ledgerEntriesTable.amountPkr} else 0 end), 0)::int`,
      ingredientCosts: sql<number>`coalesce(sum(case when ${ledgerEntriesTable.category} ilike '%ingredient%' then ${ledgerEntriesTable.amountPkr} else 0 end), 0)::int`,
    })
    .from(ledgerEntriesTable)
    .where(
      and(
        eq(ledgerEntriesTable.bakerId, bakerId),
        gte(ledgerEntriesTable.entryDate, startDate),
        lte(ledgerEntriesTable.entryDate, endDate),
      ),
    );

  const [inventory] = await db
    .select({
      inventoryValue: sql<number>`coalesce(sum(${inventoryItemsTable.qtyInStock} * ${inventoryItemsTable.unitCostPkr}), 0)::int`,
      lowStockCount: sql<number>`coalesce(sum(case when ${inventoryItemsTable.qtyInStock} <= ${inventoryItemsTable.reorderLevel} then 1 else 0 end), 0)::int`,
      totalItems: sql<number>`coalesce(count(*), 0)::int`,
    })
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.bakerId, bakerId));

  const productMargins = await computeProductMargins(bakerId, startDate, endDate);
  const estimatedCogsFromRecipes = productMargins.reduce((sum, p) => sum + p.estimatedCogsPkr, 0);
  const grossMarginFromRecipes = sales.revenue - estimatedCogsFromRecipes;
  const netProfit = sales.revenue - expenses.totalExpenses;
  const netAfterCogs = grossMarginFromRecipes - (expenses.totalExpenses - expenses.deliveryCosts);

  res.json({
    period: range.period,
    label: range.label,
    startDate,
    endDate,
    revenueFromOrders: sales.revenue,
    revenue: sales.revenue,
    orders: sales.orders,
    deliveredOrders: sales.deliveredOrders,
    manualExpenses: expenses.totalExpenses,
    totalExpenses: expenses.totalExpenses,
    deliveryCosts: expenses.deliveryCosts,
    ingredientCosts: expenses.ingredientCosts,
    estimatedCogsFromRecipes,
    grossMarginFromRecipes,
    estimatedProfit: netProfit,
    netProfitAfterCogs: netAfterCogs,
    profitMargin: sales.revenue > 0 ? Math.round((netProfit / sales.revenue) * 1000) / 10 : null,
    orderVsExpenseGap: sales.revenue - expenses.totalExpenses,
    inventoryValue: inventory.inventoryValue,
    lowStockCount: inventory.lowStockCount,
    totalInventoryItems: inventory.totalItems,
    productMargins,
  });
});

export default router;
