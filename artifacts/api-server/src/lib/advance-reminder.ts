import { eq } from "drizzle-orm";
import { bakersTable, db, ordersTable } from "@workspace/db";
import { logger } from "./logger.js";
import { sendAdvancePaymentReminder } from "./order-payments.js";
import { sendN8nEvent } from "./n8n.js";

export async function maybeSendAdvanceReminder(orderId: number): Promise<void> {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order || order.advancePaid || !order.requireAdvance) return;

    const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, order.bakerId));
    if (!baker) return;

    const threshold = baker.advanceThresholdPkr ?? 2000;
    const advancePct = baker.advancePercentage ?? 50;
    const agentConf = (baker.agentConfig ?? {}) as { paymentMode?: string };
    const fullAdvance = agentConf.paymentMode === "full_advance" || advancePct >= 100;
    if (!fullAdvance && order.totalPkr < threshold) return;

    const advanceAmount = fullAdvance
      ? order.totalPkr
      : Math.ceil((order.totalPkr * advancePct) / 100);

    await sendAdvancePaymentReminder({
      order: {
        id: order.id,
        buyerName: order.buyerName,
        buyerWhatsapp: order.buyerWhatsapp,
        totalPkr: order.totalPkr,
        bakerId: order.bakerId,
      },
      baker: {
        businessName: baker.businessName,
        paymentDetails: baker.paymentDetails,
        advancePercentage: advancePct,
        advanceAmountPkr: advanceAmount,
      },
    });

    void sendN8nEvent("payment.advance_reminder", {
      bakerId: baker.id,
      orderId: order.id,
      advanceAmountPkr: advanceAmount,
      buyerWhatsapp: order.buyerWhatsapp,
    });
  } catch (err) {
    logger.error({ err, orderId }, "Advance payment reminder failed");
  }
}
