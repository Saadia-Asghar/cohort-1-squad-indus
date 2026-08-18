import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { conversationMemoryTable, customersTable, db } from "@workspace/db";
import {
  GetCustomerParams,
  ListCustomersQueryParams,
} from "@workspace/api-zod";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";

const router = Router();

// GET /customers
router.get("/customers", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const query = ListCustomersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const customers = await db.select().from(customersTable)
    .where(eq(customersTable.bakerId, query.data.bakerId));
  res.json(customers);
});

// GET /customers/:customerId
router.get("/customers/:customerId", requireBakerAuth, async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.customerId));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  if ((req as { bakerId?: number }).bakerId !== customer.bakerId) {
    res.status(403).json({ error: "You can only access your own customers." });
    return;
  }
  res.json(customer);
});

router.get(
  "/bakers/:bakerId/customers/:customerId/memory",
  requireBakerAuth,
  requireBakerOwnership,
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    const customerId = Number(req.params.customerId);
    if (!Number.isInteger(bakerId) || !Number.isInteger(customerId)) {
      res.status(400).json({ error: "Invalid customer" });
      return;
    }
    const [customer] = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(and(eq(customersTable.id, customerId), eq(customersTable.bakerId, bakerId)))
      .limit(1);
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    const [memory] = await db
      .select()
      .from(conversationMemoryTable)
      .where(
        and(eq(conversationMemoryTable.bakerId, bakerId), eq(conversationMemoryTable.buyerId, customerId)),
      )
      .limit(1);
    res.json({
      summary: memory?.summary ?? null,
      preferences: memory?.preferences ?? {},
      lastActiveAt: memory?.lastActiveAt ?? null,
    });
  },
);

router.patch(
  "/bakers/:bakerId/customers/:customerId/memory",
  requireBakerAuth,
  requireBakerOwnership,
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    const customerId = Number(req.params.customerId);
    const parsed = z
      .object({
        bakerNote: z.string().trim().max(160).optional(),
        eggless: z.boolean().optional(),
        preferredArea: z.string().trim().max(80).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [customer] = await db
      .select({ id: customersTable.id, name: customersTable.name })
      .from(customersTable)
      .where(and(eq(customersTable.id, customerId), eq(customersTable.bakerId, bakerId)))
      .limit(1);
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(conversationMemoryTable)
      .where(
        and(eq(conversationMemoryTable.bakerId, bakerId), eq(conversationMemoryTable.buyerId, customerId)),
      )
      .limit(1);
    const current = (existing?.preferences ?? {}) as Record<string, unknown>;
    const preferences = {
      ...current,
      ...(parsed.data.bakerNote !== undefined ? { bakerNote: parsed.data.bakerNote } : {}),
      ...(typeof parsed.data.eggless === "boolean"
        ? { eggless: parsed.data.eggless, pinEggless: true }
        : {}),
      ...(parsed.data.preferredArea !== undefined ? { preferredArea: parsed.data.preferredArea } : {}),
    };
    const summaryBits = [
      preferences.eggless ? "Eggless" : null,
      typeof preferences.preferredArea === "string" ? `Prefers ${preferences.preferredArea}` : null,
      typeof preferences.bakerNote === "string" && preferences.bakerNote ? preferences.bakerNote : null,
    ].filter(Boolean);
    const summary = summaryBits.join(". ").slice(0, 240) || existing?.summary || "Baker-updated customer memory.";

    if (existing) {
      const [updated] = await db
        .update(conversationMemoryTable)
        .set({ preferences, summary, lastActiveAt: new Date(), buyerName: customer.name })
        .where(eq(conversationMemoryTable.id, existing.id))
        .returning();
      res.json({ ok: true, summary: updated.summary, preferences: updated.preferences });
      return;
    }

    const [created] = await db
      .insert(conversationMemoryTable)
      .values({
        bakerId,
        buyerId: customerId,
        buyerName: customer.name,
        preferences,
        summary,
        lastActiveAt: new Date(),
      })
      .returning();
    res.json({ ok: true, summary: created.summary, preferences: created.preferences });
  },
);

export default router;
