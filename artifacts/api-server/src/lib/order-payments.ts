import { eq } from "drizzle-orm";
import { db, metaConnectionsTable, notificationsTable } from "@workspace/db";
import { decryptSecret } from "./secret-box.js";
import { sendWhatsAppTextMessage } from "./whatsapp.js";
import { logger } from "./logger.js";

async function resolveWhatsAppSender(bakerId: number): Promise<{
  phoneNumberId: string;
  accessToken?: string;
} | null> {
  const [connection] = await db
    .select()
    .from(metaConnectionsTable)
    .where(eq(metaConnectionsTable.bakerId, bakerId))
    .limit(1);

  if (connection?.whatsappPhoneNumberId) {
    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    const encrypted = connection.whatsappAccessTokenEncrypted;
    let accessToken: string | undefined;
    if (encrypted && encryptionKey) {
      accessToken = decryptSecret(encrypted, encryptionKey);
    }
    return { phoneNumberId: connection.whatsappPhoneNumberId, accessToken };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (phoneNumberId) {
    return { phoneNumberId, accessToken: process.env.WHATSAPP_ACCESS_TOKEN };
  }

  return null;
}

export function buildAdvancePaymentMessage(input: {
  order: { id: number; buyerName: string; totalPkr: number };
  baker: { businessName: string; paymentDetails: string; advancePercentage: number; advanceAmountPkr: number };
}): string {
  const { order, baker } = input;
  const lines = [
    `Assalam-o-Alaikum ${order.buyerName}!`,
    `Thank you for your order #${order.id} at ${baker.businessName}.`,
    ``,
    `Total: PKR ${order.totalPkr.toLocaleString()}`,
    `Advance required (${baker.advancePercentage}%): PKR ${baker.advanceAmountPkr.toLocaleString()}`,
    ``,
    baker.paymentDetails.trim()
      ? `Send advance to:\n${baker.paymentDetails.trim()}`
      : `Please contact us for payment details.`,
    ``,
    `After paying, reply with your payment screenshot or transaction ID.`,
    `Roman Urdu: Advance bhej dein aur screenshot share karein — order confirm ho jayega.`,
  ];
  return lines.join("\n");
}

export async function sendAdvancePaymentReminder(input: {
  order: {
    id: number;
    buyerName: string;
    buyerWhatsapp: string;
    totalPkr: number;
    bakerId: number;
  };
  baker: {
    businessName: string;
    paymentDetails: string;
    advancePercentage: number;
    advanceAmountPkr: number;
  };
}): Promise<boolean> {
  const message = buildAdvancePaymentMessage({ order: input.order, baker: input.baker });
  const sender = await resolveWhatsAppSender(input.order.bakerId);
  let sent = false;

  if (sender) {
    sent = await sendWhatsAppTextMessage(
      sender.phoneNumberId,
      input.order.buyerWhatsapp,
      message,
      sender.accessToken,
    );
  } else {
    logger.info({ orderId: input.order.id }, "WhatsApp not configured — advance reminder skipped");
  }

  await db.insert(notificationsTable).values({
    bakerId: input.order.bakerId,
    type: "payment_reminder",
    title: `Advance reminder — order #${input.order.id}`,
    message: sent
      ? `Advance payment reminder sent to ${input.order.buyerName} on WhatsApp.`
      : `Order #${input.order.id} needs advance (PKR ${input.baker.advanceAmountPkr.toLocaleString()}). Connect WhatsApp to auto-remind.`,
    relatedId: input.order.id,
    relatedType: "order",
  });

  return sent;
}
