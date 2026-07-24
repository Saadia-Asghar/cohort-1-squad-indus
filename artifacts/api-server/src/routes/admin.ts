import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { bakersTable, db } from "@workspace/db";
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

export default router;
