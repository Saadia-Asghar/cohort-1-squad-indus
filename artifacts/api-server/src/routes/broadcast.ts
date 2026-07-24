import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, metaConnectionsTable, customersTable, bakersTable } from "@workspace/db";
import {
  requireBakerAuth,
  requireBakerOwnership,
} from "../middlewares/auth.js";
import { decryptSecret } from "../lib/secret-box.js";
import { sendWhatsAppTextMessage } from "../lib/whatsapp.js";
import { rateLimit } from "../middlewares/rate-limiter.js";
import { isPlanAccessActive } from "../lib/subscription.js";

const router = Router();

router.post(
  "/bakers/:bakerId/broadcast",
  requireBakerAuth,
  requireBakerOwnership,
  rateLimit(10, 15 * 60 * 1000),
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    const parsed = z.object({
      message: z.string().trim().min(5).max(900),
      /** When set, send a single test message instead of segment blast. */
      testPhone: z.string().trim().min(10).max(24).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      /** Real CRM filters — matches Analytics segment ids */
      segment: z.enum(["all", "frequent_buyers", "inactive_loyalists", "festival_buyers"]).optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId)).limit(1);
    if (!baker) {
      res.status(404).json({ error: "Baker not found" });
      return;
    }
    if (!isPlanAccessActive(baker)) {
      res.status(403).json({
        error: "Your 3-day Launch Free trial has ended. Upgrade to broadcast again.",
      });
      return;
    }

    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    const [connection] = await db
      .select()
      .from(metaConnectionsTable)
      .where(eq(metaConnectionsTable.bakerId, bakerId))
      .limit(1);

    if (
      !encryptionKey ||
      !connection?.whatsappPhoneNumberId ||
      !connection.whatsappAccessTokenEncrypted
    ) {
      res.status(409).json({
        error: "Connect WhatsApp Business in Agent Hub before sending broadcasts.",
        connected: false,
      });
      return;
    }

    let accessToken: string;
    try {
      accessToken = decryptSecret(connection.whatsappAccessTokenEncrypted, encryptionKey);
    } catch {
      res.status(500).json({ error: "Could not unlock the bakery WhatsApp token." });
      return;
    }

    if (parsed.data.testPhone) {
      const ok = await sendWhatsAppTextMessage(
        connection.whatsappPhoneNumberId,
        parsed.data.testPhone,
        parsed.data.message,
        accessToken,
      );
      res.json({
        mode: "test",
        sent: ok ? 1 : 0,
        failed: ok ? 0 : 1,
        connected: true,
      });
      return;
    }

    const allCustomers = await db
      .select({
        phone: customersTable.whatsappNumber,
        name: customersTable.name,
        isRegular: customersTable.isRegular,
        isAtRisk: customersTable.isAtRisk,
        totalOrders: customersTable.totalOrders,
      })
      .from(customersTable)
      .where(eq(customersTable.bakerId, bakerId));

    const segment = parsed.data.segment ?? "all";
    const filtered = allCustomers.filter((c) => {
      if (segment === "frequent_buyers") return c.isRegular && !c.isAtRisk;
      if (segment === "inactive_loyalists") return c.isAtRisk;
      if (segment === "festival_buyers") return !c.isRegular && !c.isAtRisk && (c.totalOrders ?? 0) > 0;
      return true;
    });
    const customers = filtered.slice(0, parsed.data.limit ?? 50);

    let sent = 0;
    let failed = 0;
    for (const customer of customers) {
      if (!customer.phone) {
        failed += 1;
        continue;
      }
      const ok = await sendWhatsAppTextMessage(
        connection.whatsappPhoneNumberId,
        customer.phone,
        parsed.data.message,
        accessToken,
      );
      if (ok) sent += 1;
      else failed += 1;
    }

    res.json({
      mode: "segment",
      segment,
      targeted: customers.length,
      matched: filtered.length,
      sent,
      failed,
      connected: true,
    });
  },
);

export default router;
