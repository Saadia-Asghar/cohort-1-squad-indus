import { and, desc, eq, isNull } from "drizzle-orm";
import {
  bakersTable,
  db,
  metaConnectionsTable,
  notificationsTable,
  ordersTable,
  reviewsTable,
} from "@workspace/db";
import { decryptSecret } from "./secret-box.js";
import { phonesMatch, sendWhatsAppTextMessage } from "./whatsapp.js";
import { logger } from "./logger.js";

export type ServiceFeedback = "loved_it" | "okay" | "had_issue";

export const FEEDBACK_LABELS: Record<ServiceFeedback, string> = {
  loved_it: "Loved it",
  okay: "Okay",
  had_issue: "Had an issue",
};

export function parseFeedbackReply(text: string): ServiceFeedback | null {
  const t = text.trim().toLowerCase();
  if (/^1\b|loved|love it|great|excellent|happy|mashallah|amazing/.test(t)) return "loved_it";
  if (/^3\b|issue|problem|bad|unhappy|complain|late|wrong/.test(t)) return "had_issue";
  if (/^2\b|okay|ok|fine|average|theek/.test(t)) return "okay";
  return null;
}

function frontendBase(): string {
  return (
    process.env.FRONTEND_URL?.replace(/\/$/, "") ??
    "https://cohort-1-squad-indus-sweet-tooth.vercel.app"
  );
}

export function buildDeliveryFeedbackMessage(
  order: { id: number; buyerName: string },
  baker: { businessName: string },
): string {
  const link = `${frontendBase()}/feedback/${order.id}`;
  return [
    `Assalam-o-Alaikum ${order.buyerName}!`,
    `Your order #${order.id} from ${baker.businessName} has been delivered.`,
    ``,
    `How was your experience? Reply with:`,
    `1 — Loved it`,
    `2 — Okay`,
    `3 — Had an issue`,
    ``,
    `Or tap: ${link}`,
  ].join("\n");
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "received",
  confirmed: "confirmed",
  in_production: "being prepared",
  out_for_delivery: "out for delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

export async function sendOrderStatusUpdate(
  order: typeof ordersTable.$inferSelect,
  baker: typeof bakersTable.$inferSelect,
): Promise<boolean> {
  const status = ORDER_STATUS_LABELS[order.status] ?? order.status.replace(/_/g, " ");
  const sender = await resolveWhatsAppSender(order.bakerId);
  if (!sender) return false;
  const message = [
    `Assalam-o-Alaikum ${order.buyerName}!`,
    `Update from ${baker.businessName}: your order #${order.id} is ${status}.`,
    order.deliveryDate ? `Delivery date: ${new Date(order.deliveryDate).toISOString().slice(0, 10)}.` : "",
    "Reply here if you need help with this order.",
  ].filter(Boolean).join("\n");
  const sent = await sendWhatsAppTextMessage(sender.phoneNumberId, order.buyerWhatsapp, message, sender.accessToken);
  if (!sent) logger.warn({ orderId: order.id, status: order.status }, "WhatsApp order-status update was not accepted");
  return sent;
}

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

export async function sendDeliveryFeedbackRequest(
  order: typeof ordersTable.$inferSelect,
  baker: typeof bakersTable.$inferSelect,
): Promise<boolean> {
  const message = buildDeliveryFeedbackMessage(order, baker);
  const sender = await resolveWhatsAppSender(baker.id);
  let sent = false;

  if (sender) {
    sent = await sendWhatsAppTextMessage(
      sender.phoneNumberId,
      order.buyerWhatsapp,
      message,
      sender.accessToken,
    );
  } else {
    logger.info({ orderId: order.id }, "WhatsApp not configured — feedback link only in notification");
  }

  await db.insert(notificationsTable).values({
    bakerId: baker.id,
    type: "order_delivered",
    title: `Order #${order.id} delivered`,
    message: sent
      ? `Feedback request sent to ${order.buyerName} on WhatsApp.`
      : `Share feedback link: ${frontendBase()}/feedback/${order.id}`,
    relatedId: order.id,
    relatedType: "order",
  });

  return sent;
}

export async function findPendingFeedbackOrder(
  bakerId: number,
  buyerWhatsapp: string,
): Promise<typeof ordersTable.$inferSelect | null> {
  const recent = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.bakerId, bakerId),
        eq(ordersTable.status, "delivered"),
        isNull(ordersTable.serviceFeedback),
      ),
    )
    .orderBy(desc(ordersTable.deliveredAt))
    .limit(10);

  return recent.find((o) => phonesMatch(o.buyerWhatsapp, buyerWhatsapp)) ?? null;
}

export async function recordOrderFeedback(input: {
  orderId: number;
  feedback: ServiceFeedback;
  note?: string;
  buyerWhatsapp?: string;
}): Promise<typeof ordersTable.$inferSelect | null> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, input.orderId)).limit(1);
  if (!order || order.status !== "delivered" || order.serviceFeedback) {
    return null;
  }
  if (input.buyerWhatsapp && !phonesMatch(order.buyerWhatsapp, input.buyerWhatsapp)) {
    return null;
  }

  const ratingMap: Record<ServiceFeedback, number> = {
    loved_it: 5,
    okay: 3,
    had_issue: 2,
  };

  const [updated] = await db
    .update(ordersTable)
    .set({
      serviceFeedback: input.feedback,
      feedbackNote: input.note?.trim() || null,
    })
    .where(eq(ordersTable.id, input.orderId))
    .returning();

  const firstItem = Array.isArray(order.items) ? (order.items[0] as { productName?: string }) : null;
  await db.insert(reviewsTable).values({
    bakerId: order.bakerId,
    buyerId: order.buyerId,
    orderId: order.id,
    buyerName: order.buyerName,
    rating: ratingMap[input.feedback],
    reviewText: input.note?.trim() || FEEDBACK_LABELS[input.feedback],
    productName: firstItem?.productName ?? null,
  });

  await db.insert(notificationsTable).values({
    bakerId: order.bakerId,
    type: "new_message",
    title: `Feedback on order #${order.id}`,
    message: `${order.buyerName}: ${FEEDBACK_LABELS[input.feedback]}${input.note ? ` — ${input.note}` : ""}`,
    relatedId: order.id,
    relatedType: "order",
  });

  return updated ?? null;
}

export function buildFeedbackAnalytics(orders: Array<typeof ordersTable.$inferSelect>) {
  const delivered = orders.filter((o) => o.status === "delivered");
  const withFeedback = delivered.filter((o) => o.serviceFeedback);
  const loved = withFeedback.filter((o) => o.serviceFeedback === "loved_it").length;
  const okay = withFeedback.filter((o) => o.serviceFeedback === "okay").length;
  const issues = withFeedback.filter((o) => o.serviceFeedback === "had_issue").length;
  const pending = delivered.filter((o) => !o.serviceFeedback).length;
  const satisfactionRate =
    withFeedback.length > 0 ? Math.round(((loved + okay * 0.5) / withFeedback.length) * 100) : null;

  return {
    deliveredCount: delivered.length,
    feedbackReceived: withFeedback.length,
    feedbackPending: pending,
    lovedIt: loved,
    okay,
    hadIssue: issues,
    satisfactionRate,
    happyRate: withFeedback.length ? Math.round((loved / withFeedback.length) * 100) : null,
  };
}
