import { db } from "@workspace/db";
import {
  inventoryItemsTable,
  ledgerEntriesTable,
  notificationsTable,
  chatMessagesTable,
  conversationMemoryTable,
  bakerNotesTable,
  bakerRemindersTable,
  ordersTable,
  customersTable,
} from "@workspace/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { daysAgo } from "./seed-baker-demo.js";

export type FeaturePackBaker = {
  id: number;
  businessName: string;
  ownerName: string;
  phoneBase: string;
  /** Prefer WhatsApp-heavy chats */
  includeWhatsAppChats?: boolean;
  /** Prefer Instagram session chats */
  includeInstagramChats?: boolean;
};

function dateStr(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

/** Inventory + ledger for Khata tab */
export async function seedKhataPack(bakerId: number): Promise<void> {
  const existing = await db
    .select({ id: inventoryItemsTable.id })
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.bakerId, bakerId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(inventoryItemsTable).values([
    {
      bakerId,
      name: "All-purpose flour",
      unit: "kg",
      qtyInStock: 12,
      reorderLevel: 5,
      unitCostPkr: 180,
    },
    {
      bakerId,
      name: "Caster sugar",
      unit: "kg",
      qtyInStock: 4,
      reorderLevel: 5,
      unitCostPkr: 220,
    },
    {
      bakerId,
      name: "Belgian dark chocolate",
      unit: "kg",
      qtyInStock: 2,
      reorderLevel: 1,
      unitCostPkr: 3200,
    },
    {
      bakerId,
      name: "Cake boxes (1kg)",
      unit: "pcs",
      qtyInStock: 35,
      reorderLevel: 20,
      unitCostPkr: 45,
    },
    {
      bakerId,
      name: "Fresh cream",
      unit: "litre",
      qtyInStock: 3,
      reorderLevel: 2,
      unitCostPkr: 650,
    },
    {
      bakerId,
      name: "Eggs (tray)",
      unit: "pcs",
      qtyInStock: 1,
      reorderLevel: 2,
      unitCostPkr: 420,
    },
  ]);

  await db.insert(ledgerEntriesTable).values([
    {
      bakerId,
      type: "expense",
      category: "ingredients",
      description: "Weekly flour + sugar restock",
      amountPkr: 4200,
      entryDate: dateStr(2),
    },
    {
      bakerId,
      type: "expense",
      category: "ingredients",
      description: "Chocolate & cream purchase",
      amountPkr: 7800,
      entryDate: dateStr(5),
    },
    {
      bakerId,
      type: "delivery_cost",
      category: "delivery",
      description: "Rider for DHA deliveries",
      amountPkr: 1500,
      entryDate: dateStr(1),
    },
    {
      bakerId,
      type: "delivery_cost",
      category: "delivery",
      description: "Weekend delivery fuel",
      amountPkr: 800,
      entryDate: dateStr(8),
    },
    {
      bakerId,
      type: "expense",
      category: "packaging",
      description: "Cake boxes + ribbons",
      amountPkr: 2200,
      entryDate: dateStr(10),
    },
    {
      bakerId,
      type: "expense",
      category: "utilities",
      description: "Extra gas for oven week",
      amountPkr: 1800,
      entryDate: dateStr(12),
    },
    {
      bakerId,
      type: "sale_adjustment",
      category: "discount",
      description: "Eid promo discount given",
      amountPkr: 500,
      entryDate: dateStr(15),
    },
    {
      bakerId,
      type: "expense",
      category: "ingredients",
      description: "Last month bulk butter",
      amountPkr: 5500,
      entryDate: dateStr(35),
    },
  ]);
}

/** Bell notifications for dashboard */
export async function seedNotificationsPack(bakerId: number): Promise<void> {
  const existing = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(eq(notificationsTable.bakerId, bakerId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(notificationsTable).values([
    {
      bakerId,
      type: "new_order",
      title: "New order received",
      message: "A buyer just placed a cake order. Review it in Orders.",
      relatedType: "order",
      isRead: false,
      createdAt: daysAgo(0),
    },
    {
      bakerId,
      type: "payment_pending",
      title: "Advance payment pending",
      message: "Order waiting for advance transfer proof.",
      relatedType: "order",
      isRead: false,
      createdAt: daysAgo(1),
    },
    {
      bakerId,
      type: "chat_escalation",
      title: "Buyer asked for baker",
      message: "A WhatsApp shopper wants a custom design — reply personally.",
      relatedType: "chat",
      isRead: false,
      createdAt: daysAgo(1),
    },
    {
      bakerId,
      type: "order_delivered",
      title: "Order delivered",
      message: "Feedback request sent to the customer.",
      relatedType: "order",
      isRead: true,
      createdAt: daysAgo(3),
    },
    {
      bakerId,
      type: "new_message",
      title: "New chat message",
      message: "Someone asked about eggless options on your menu.",
      relatedType: "chat",
      isRead: true,
      createdAt: daysAgo(4),
    },
    {
      bakerId,
      type: "payment_reminder",
      title: "Advance reminder sent",
      message: "WhatsApp advance reminder delivered to the buyer.",
      relatedType: "order",
      isRead: true,
      createdAt: daysAgo(2),
    },
  ]);
}

/** Workspace notes + reminders on home */
export async function seedWorkspacePack(bakerId: number): Promise<void> {
  const existing = await db
    .select({ id: bakerNotesTable.id })
    .from(bakerNotesTable)
    .where(eq(bakerNotesTable.bakerId, bakerId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(bakerNotesTable).values([
    {
      bakerId,
      content: "Buy edible flowers for weekend wedding cake.",
      pinned: true,
    },
    {
      bakerId,
      content: "Confirm Eid box flavours with regulars by Thursday.",
      pinned: false,
    },
    {
      bakerId,
      content: "Restock cake boxes before Friday rush.",
      pinned: false,
    },
  ]);

  await db.insert(bakerRemindersTable).values([
    {
      bakerId,
      title: "Call rider for DHA Phase 2 drop",
      dueAt: daysAgo(-1),
      done: false,
    },
    {
      bakerId,
      title: "Post Instagram story — weekend special",
      dueAt: daysAgo(-2),
      done: false,
    },
    {
      bakerId,
      title: "Reconcile JazzCash receipts",
      dueAt: daysAgo(1),
      done: true,
    },
  ]);
}

/** Mark delivered orders with service feedback for Analytics */
export async function seedFeedbackOnDeliveredOrders(bakerId: number): Promise<void> {
  const delivered = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.bakerId, bakerId), eq(ordersTable.status, "delivered")));

  const feedbackCycle = ["loved_it", "loved_it", "okay", "loved_it", "had_issue"] as const;
  for (let i = 0; i < delivered.length; i++) {
    const order = delivered[i];
    const feedback = feedbackCycle[i % feedbackCycle.length];
    await db
      .update(ordersTable)
      .set({
        serviceFeedback: feedback,
        feedbackNote:
          feedback === "had_issue"
            ? "Delivery was a bit late"
            : feedback === "okay"
              ? "Cake was good"
              : "Absolutely delicious!",
        feedbackRequestedAt: daysAgo(Math.max(1, 3)),
        deliveredAt: order.createdAt ? new Date(order.createdAt.getTime() + 2 * 86400000) : daysAgo(2),
        requireAdvance: i % 3 === 0,
        advancePaid: i % 3 === 0 ? true : false,
        fulfillmentType: i % 2 === 0 ? "delivery" : "pickup",
        paymentAmountReceived: order.paymentStatus === "paid" ? order.totalPkr : null,
      })
      .where(eq(ordersTable.id, order.id));
  }

  // Ensure some pending-payment + advance-required active orders for Payments tab
  const openOrders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.bakerId, bakerId), ne(ordersTable.status, "cancelled")));

  for (const order of openOrders.slice(0, 2)) {
    if (order.status === "new" || order.status === "confirmed") {
      await db
        .update(ordersTable)
        .set({
          requireAdvance: true,
          advancePaid: false,
          paymentStatus: "pending",
        })
        .where(eq(ordersTable.id, order.id));
    }
  }
}

/** Chat threads for Agent Hub (web + optional WA/IG) */
export async function seedChatPack(baker: FeaturePackBaker): Promise<void> {
  const existingChats = await db
    .select({ id: chatMessagesTable.id })
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.bakerId, baker.id))
    .limit(1);
  if (existingChats.length > 0) return;

  const customers = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.bakerId, baker.id))
    .limit(3);

  if (customers.length === 0) return;
  const [c0, c1, c2] = [customers[0], customers[1] ?? customers[0], customers[2] ?? customers[0]];

  const webSession = `web-${baker.id}-${c0.id}-demo`;
  const rows: Array<{
    bakerId: number;
    buyerId: number;
    sessionId: string;
    role: string;
    content: string;
    createdAt?: Date;
  }> = [
    {
      bakerId: baker.id,
      buyerId: c0.id,
      sessionId: webSession,
      role: "user",
      content: "Assalam-o-Alaikum! Do you deliver to my area?",
      createdAt: daysAgo(0),
    },
    {
      bakerId: baker.id,
      buyerId: c0.id,
      sessionId: webSession,
      role: "assistant",
      content: `Wa Alaikum Assalam! ${baker.businessName} delivers to several areas. Tell me your sector and I will confirm.`,
      createdAt: daysAgo(0),
    },
    {
      bakerId: baker.id,
      buyerId: c0.id,
      sessionId: webSession,
      role: "user",
      content: "What is your payment policy? COD or advance?",
      createdAt: daysAgo(0),
    },
    {
      bakerId: baker.id,
      buyerId: c0.id,
      sessionId: webSession,
      role: "assistant",
      content: "We offer COD and advance options depending on order size. I can share exact details for your cake.",
      createdAt: daysAgo(0),
    },
  ];

  if (baker.includeWhatsAppChats !== false) {
    const waSession = `wa-${baker.id}-${c1.whatsappNumber.replace(/\D/g, "")}`;
    rows.push(
      {
        bakerId: baker.id,
        buyerId: c1.id,
        sessionId: waSession,
        role: "user",
        content: "Hi, I want a 1kg black forest for Saturday",
        createdAt: daysAgo(1),
      },
      {
        bakerId: baker.id,
        buyerId: c1.id,
        sessionId: waSession,
        role: "assistant",
        content: "Great choice! 1 Kg is available. Shall I confirm delivery for Saturday?",
        createdAt: daysAgo(1),
      },
      {
        bakerId: baker.id,
        buyerId: c1.id,
        sessionId: waSession,
        role: "user",
        content: "Yes please. Gulberg delivery.",
        createdAt: daysAgo(1),
      },
    );
  }

  if (baker.includeInstagramChats) {
    const igSession = `ig-${baker.id}-iguser${c2.id}`;
    rows.push(
      {
        bakerId: baker.id,
        buyerId: c2.id,
        sessionId: igSession,
        role: "user",
        content: "Saw your reel — do you do custom cupcakes?",
        createdAt: daysAgo(2),
      },
      {
        bakerId: baker.id,
        buyerId: c2.id,
        sessionId: igSession,
        role: "assistant",
        content: `Yes! ${baker.ownerName} does custom cupcake boxes. Share your theme and date.`,
        createdAt: daysAgo(2),
      },
    );
  }

  await db.insert(chatMessagesTable).values(rows);

  await db
    .insert(conversationMemoryTable)
    .values(
      customers.slice(0, 3).map((c, idx) => ({
        bakerId: baker.id,
        buyerId: c.id,
        buyerName: c.name,
        preferences: {
          preferredArea: c.preferredArea ?? undefined,
          eggless: idx === 0,
          favoriteProducts: idx === 0 ? ["Classic Black Forest Cake"] : [],
        },
        messageCount: 4 + idx * 2,
        summary: idx === 0 ? "Prefers eggless; area delivery preferred." : "Recent menu conversation saved.",
        lastActiveAt: daysAgo(idx),
      })),
    )
    .onConflictDoNothing({
      target: [conversationMemoryTable.bakerId, conversationMemoryTable.buyerId],
    });
}

/** Full feature pack used by every demo baker */
export async function seedFullFeaturePack(baker: FeaturePackBaker): Promise<void> {
  await seedKhataPack(baker.id);
  await seedNotificationsPack(baker.id);
  await seedWorkspacePack(baker.id);
  await seedFeedbackOnDeliveredOrders(baker.id);
  await seedChatPack(baker);
}
