import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { bakersTable, whatsappWaitlistTable, db } from "@workspace/db";
import { sendN8nEvent } from "../lib/n8n.js";
import { isPaidPlanId } from "../lib/platform-billing.js";
import { enrichPitchData } from "../seed-enrich.js";

const router = Router();

function requireAdminBearer(req: { headers: { authorization?: string } }, res: {
  status: (code: number) => { json: (body: unknown) => void };
}): boolean {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const enrichSecret = process.env.ENRICH_DEMO_SECRET?.trim();
  const auth = req.headers.authorization;
  const allowed = [jwtSecret, enrichSecret].filter(Boolean);
  if (allowed.length === 0 || !auth || !allowed.some((s) => auth === `Bearer ${s}`)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

/** One-time pitch data enrich. Requires Authorization: Bearer <JWT_SECRET or ENRICH_DEMO_SECRET>. */
router.post("/admin/enrich-demo", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;

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
 * Authorization: Bearer <JWT_SECRET or ENRICH_DEMO_SECRET>
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
        subscriptionPlan: bakersTable.subscriptionPlan,
        agentActive: bakersTable.agentActive,
        trialEndsAt: bakersTable.trialEndsAt,
        createdAt: bakersTable.createdAt,
      })
      .from(bakersTable)
      .orderBy(bakersTable.id);

    res.json(bakers);
  } catch (error) {
    console.error("admin get bakers failed", error);
    res.status(500).json({ error: "Failed to fetch bakers" });
  }
});

/**
 * Manually activate a paid plan after JazzCash / Easypaisa / bank + WhatsApp confirmation.
 * Authorization: Bearer <JWT_SECRET or ENRICH_DEMO_SECRET>
 */
router.post("/admin/activate-plan", async (req, res): Promise<void> => {
  if (!requireAdminBearer(req, res)) return;

  const parsed = z
    .object({
      bakerId: z.number().int().positive(),
      planId: z.enum(["starter", "pro", "bakery_plus"]),
      clearTrial: z.boolean().optional().default(true),
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
  if (!isPaidPlanId(parsed.data.planId)) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  const prevConfig = (baker.agentConfig ?? {}) as Record<string, unknown>;
  const { pendingPlanId: _p, billingRequestedAt: _t, billingNote: _n, ...rest } = prevConfig;
  const nextConfig = { ...rest };

  const [updated] = await db
    .update(bakersTable)
    .set({
      subscriptionPlan: parsed.data.planId,
      trialEndsAt: parsed.data.clearTrial ? null : baker.trialEndsAt,
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

/**
 * Set platform JazzCash / WhatsApp billing details at runtime (also set via Vercel env).
 * Writes process.env for this instance; prefer Vercel env for multi-instance production.
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
  if (parsed.data.whatsapp) process.env.PLATFORM_WHATSAPP = parsed.data.whatsapp;
  if (parsed.data.paymentDetails) process.env.PLATFORM_PAYMENT_DETAILS = parsed.data.paymentDetails;
  if (parsed.data.ownerName) process.env.PLATFORM_BILLING_NAME = parsed.data.ownerName;

  const { getPlatformBillingConfig } = await import("../lib/platform-billing.js");
  res.json({ ok: true, platform: getPlatformBillingConfig() });
});

/** Public: anyone can join the WhatsApp Agent waitlist. */
router.post("/waitlist", async (req, res): Promise<void> => {
  const parsed = z
    .object({
      bakerId: z.number().int().positive().optional().nullable(),
      bakerName: z.string().trim().min(1).max(100),
      bakerEmail: z.string().trim().email(),
      whatsappNumber: z.string().trim().min(10).max(24),
      note: z.string().trim().max(500).optional().nullable(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [entry] = await db
      .insert(whatsappWaitlistTable)
      .values({
        bakerId: parsed.data.bakerId ?? null,
        bakerName: parsed.data.bakerName,
        bakerEmail: parsed.data.bakerEmail,
        whatsappNumber: parsed.data.whatsappNumber,
        note: parsed.data.note ?? null,
        status: "pending",
      })
      .returning();

    void sendN8nEvent("waitlist.joined", {
      id: entry.id,
      bakerName: entry.bakerName,
      bakerEmail: entry.bakerEmail,
      whatsappNumber: entry.whatsappNumber,
    });

    res.status(201).json({ ok: true, entry });
  } catch (error) {
    console.error("Failed to add to waitlist:", error);
    res.status(500).json({ error: "Failed to join waitlist" });
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

export default router;
