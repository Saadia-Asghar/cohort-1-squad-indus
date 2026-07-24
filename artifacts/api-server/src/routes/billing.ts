import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { bakersTable, db } from "@workspace/db";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";
import { sendN8nEvent } from "../lib/n8n.js";
import {
  buildUpgradeWhatsAppUrl,
  getPlatformBillingConfig,
  isPaidPlanId,
  readBillingState,
  type PaidPlanId,
} from "../lib/platform-billing.js";

const PLAN_LABELS: Record<PaidPlanId, { name: string; monthlyPkr: number }> = {
  starter: { name: "Kitchen Standard", monthlyPkr: 1799 },
  pro: { name: "Kitchen Pro", monthlyPkr: 2999 },
  bakery_plus: { name: "Bakery Team", monthlyPkr: 4499 },
};

const router = Router();

/** Public: how bakers pay the platform (WhatsApp + manual transfer — no gateway). */
router.get("/billing/platform", (_req, res): void => {
  res.json(getPlatformBillingConfig());
});

/** Baker requests an upgrade — records pending plan + returns WhatsApp deep link. */
router.post(
  "/bakers/:bakerId/billing/request-upgrade",
  requireBakerAuth,
  requireBakerOwnership,
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    const parsed = z
      .object({
        planId: z.enum(["starter", "pro", "bakery_plus"]),
        note: z.string().trim().max(240).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId)).limit(1);
    if (!baker) {
      res.status(404).json({ error: "Baker not found" });
      return;
    }

    const plan = PLAN_LABELS[parsed.data.planId];
    const platform = getPlatformBillingConfig();
    const amountLabel = `PKR ${plan.monthlyPkr.toLocaleString()}/mo`;
    const whatsappUrl = buildUpgradeWhatsAppUrl({
      planId: parsed.data.planId,
      planName: plan.name,
      amountLabel,
      bakerId: baker.id,
      businessName: baker.businessName,
      ownerName: platform.ownerName,
    });

    const nextConfig = {
      ...(baker.agentConfig ?? {}),
      pendingPlanId: parsed.data.planId,
      billingRequestedAt: new Date().toISOString(),
      billingNote: parsed.data.note ?? null,
    };

    const [updated] = await db
      .update(bakersTable)
      .set({ agentConfig: nextConfig })
      .where(eq(bakersTable.id, bakerId))
      .returning();

    void sendN8nEvent("billing.upgrade_requested", {
      bakerId: baker.id,
      businessName: baker.businessName,
      planId: parsed.data.planId,
      amountLabel,
      ownerWhatsapp: baker.whatsappNumber,
    });

    const billing = readBillingState(updated.agentConfig);
    res.json({
      ok: true,
      pendingPlanId: billing.pendingPlanId,
      billingRequestedAt: billing.billingRequestedAt,
      platform,
      plan: { id: parsed.data.planId, name: plan.name, amountLabel },
      whatsappUrl,
      message: whatsappUrl
        ? "Transfer the amount, then tap WhatsApp to send your receipt. We activate after confirmation."
        : "Upgrade requested. Set PLATFORM_WHATSAPP on the API so bakers get a WhatsApp link — or message the founder manually.",
    });
  },
);

/** Current baker billing pending state */
router.get(
  "/bakers/:bakerId/billing",
  requireBakerAuth,
  requireBakerOwnership,
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId)).limit(1);
    if (!baker) {
      res.status(404).json({ error: "Baker not found" });
      return;
    }
    const billing = readBillingState(baker.agentConfig);
    const pending =
      billing.pendingPlanId && isPaidPlanId(billing.pendingPlanId)
        ? {
            planId: billing.pendingPlanId,
            name: PLAN_LABELS[billing.pendingPlanId].name,
            amountLabel: `PKR ${PLAN_LABELS[billing.pendingPlanId].monthlyPkr.toLocaleString()}/mo`,
            requestedAt: billing.billingRequestedAt ?? null,
          }
        : null;

    res.json({
      subscriptionPlan: baker.subscriptionPlan,
      pending,
      platform: getPlatformBillingConfig(),
    });
  },
);

export default router;
