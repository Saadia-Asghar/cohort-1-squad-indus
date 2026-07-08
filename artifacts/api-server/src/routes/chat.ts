import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, chatMessagesTable, bakersTable, productsTable, conversationMemoryTable, notificationsTable } from "@workspace/db";
import { SendChatMessageBody, GetChatHistoryParams } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { formatRetrievedContext, retrieveKnowledge } from "../lib/rag/retriever";

const router: IRouter = Router();

// Helper to create a baker notification
async function notify(bakerId: number, type: string, title: string, message: string, relatedId?: number, relatedType?: string) {
  try {
    await db.insert(notificationsTable).values({ bakerId, type, title, message, relatedId: relatedId ?? null, relatedType: relatedType ?? null });
  } catch (e) {
    logger.error({ err: e }, "Failed to create notification");
  }
}

// Extract buyer preferences from message for memory
function extractPreferences(message: string, existing: Record<string, unknown>) {
  const prefs: Record<string, unknown> = { ...existing };
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("eggless") || lowerMsg.includes("no egg")) {
    prefs.eggless = true;
  }
  const areaMatches = ["dha", "gulberg", "clifton", "defence", "bahria", "johar", "model town", "cavalry", "cantt", "f-7", "f-8", "f-10", "g-9"];
  for (const area of areaMatches) {
    if (lowerMsg.includes(area)) {
      prefs.preferredArea = area.toUpperCase();
      break;
    }
  }
  const allergyMatch = lowerMsg.match(/allerg(?:ic|y) to ([a-z\s]+)/);
  if (allergyMatch) {
    const allergies = (prefs.allergies as string[] ?? []);
    if (!allergies.includes(allergyMatch[1].trim())) {
      prefs.allergies = [...allergies, allergyMatch[1].trim()];
    }
  }
  return prefs;
}

// Memory-aware agent reply generator
async function generateAgentReply(
  bakerId: number,
  buyerId: number | null,
  message: string,
  memory: typeof conversationMemoryTable.$inferSelect | null
): Promise<{ reply: string; action: string | null; cartItemId: number | null; escalated: boolean }> {
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!baker) return { reply: "Baker not found.", action: null, cartItemId: null, escalated: false };

  if (!baker.agentActive) {
    return {
      reply: `${baker.businessName}'s assistant is currently unavailable. Please try again later.`,
      action: null, cartItemId: null, escalated: false,
    };
  }

  const agentConf = (baker.agentConfig ?? {}) as {
    customGreeting?: string;
    blockedTopics?: string[];
    escalateKeywords?: string[];
    autoReplyEnabled?: boolean;
    customResponses?: Array<{ trigger: string; response: string }>;
  };

  const products = await db.select().from(productsTable).where(eq(productsTable.bakerId, bakerId));
  const lowerMsg = message.toLowerCase();
  const ragChunks = await retrieveKnowledge(bakerId, message, 3, 0.1);
  const ragContext = formatRetrievedContext(ragChunks);

  // Check custom responses first
  if (agentConf.customResponses?.length) {
    for (const cr of agentConf.customResponses) {
      if (lowerMsg.includes(cr.trigger.toLowerCase())) {
        return { reply: cr.response, action: null, cartItemId: null, escalated: false };
      }
    }
  }

  // Check blocked topics — if triggered, politely decline
  if (agentConf.blockedTopics?.some(t => lowerMsg.includes(t.toLowerCase()))) {
    return {
      reply: `I'm sorry, I can't help with that. Please contact ${baker.businessName} directly on WhatsApp for more information.`,
      action: null, cartItemId: null, escalated: false,
    };
  }

  // Check baker-custom escalation keywords
  const escalateKeywords = [
    "complain", "problem", "issue", "wrong", "bad",
    ...(agentConf.escalateKeywords ?? []),
  ];
  if (escalateKeywords.some(k => lowerMsg.includes(k))) {
    return {
      reply: `I'm sorry to hear you're having an issue. I've flagged this for ${baker.businessName} and they'll be in touch shortly. You can also reach them directly on WhatsApp.`,
      action: "escalate", cartItemId: null, escalated: true,
    };
  }

  // Memory context: personalise the reply if we know this buyer
  const buyerPrefs = (memory?.preferences ?? {}) as Record<string, unknown>;
  const memoryContext = memory ? [
    buyerPrefs.eggless ? "This customer prefers eggless items." : "",
    buyerPrefs.preferredArea ? `They are usually in ${buyerPrefs.preferredArea}.` : "",
    buyerPrefs.favoriteProducts ? `Their favourites: ${(buyerPrefs.favoriteProducts as string[]).join(", ")}.` : "",
    buyerPrefs.allergies ? `ALLERGIES: ${(buyerPrefs.allergies as string[]).join(", ")} — never suggest these.` : "",
  ].filter(Boolean).join(" ") : "";

  // Price list
  if (lowerMsg.includes("price") || lowerMsg.includes("menu") || lowerMsg.includes("what do you have") || lowerMsg.includes("list")) {
    let available = products.filter((p) => p.isAvailable);
    // Filter eggless if buyer preference is set
    if (buyerPrefs.eggless) available = available.filter(p => p.isEgglessAvailable);
    if (available.length === 0) {
      return { reply: `${baker.businessName} doesn't have any ${buyerPrefs.eggless ? "eggless " : ""}products listed yet.`, action: null, cartItemId: null, escalated: false };
    }
    const list = available.map((p) => {
      const sizes = (p.sizes as Array<{ label: string; pricePkr: number }>) ?? [];
      const priceStr = sizes.length > 0
        ? sizes.map((s) => `${s.label}: PKR ${s.pricePkr.toLocaleString()}`).join(", ")
        : `PKR ${p.basePricePkr.toLocaleString()}`;
      return `• *${p.name}* — ${priceStr}${p.isEgglessAvailable ? " (eggless available)" : ""}`;
    }).join("\n");
    const personalNote = buyerPrefs.eggless ? "\n\n(Showing eggless items only based on your preference)" : "";
    return { reply: `Here's ${baker.businessName}'s menu:\n\n${list}${personalNote}\n\nWhat would you like to order?`, action: null, cartItemId: null, escalated: false };
  }

  // Eggless
  if (lowerMsg.includes("eggless") || lowerMsg.includes("egg")) {
    const eggless = products.filter((p) => p.isEgglessAvailable && p.isAvailable);
    if (eggless.length === 0) {
      return { reply: `Unfortunately, ${baker.businessName} doesn't offer eggless options at the moment.`, action: null, cartItemId: null, escalated: false };
    }
    const list = eggless.map((p) => `• ${p.name}`).join("\n");
    return { reply: `Great news! These items are available eggless:\n\n${list}\n\nWould you like to order any of these?`, action: null, cartItemId: null, escalated: false };
  }

  // Delivery
  if (lowerMsg.includes("deliver") || lowerMsg.includes("area") || lowerMsg.includes("location")) {
    const areas = (baker.deliveryAreas ?? []).join(", ");
    const personalNote = buyerPrefs.preferredArea && areas.toLowerCase().includes((buyerPrefs.preferredArea as string).toLowerCase())
      ? ` Great news — we deliver to ${buyerPrefs.preferredArea}!`
      : "";
    return {
      reply: areas
        ? `${baker.businessName} delivers to: ${areas}.${personalNote} Pickup is also available. Which area are you in?`
        : `Please contact ${baker.businessName} directly on WhatsApp to confirm delivery to your area.`,
      action: null, cartItemId: null, escalated: false,
    };
  }

  // Payment
  if (lowerMsg.includes("pay") || lowerMsg.includes("payment") || lowerMsg.includes("cod") || lowerMsg.includes("cash")) {
    const policy = baker.codPolicy ?? "Cash on delivery (COD) only. Full payment required at the time of delivery.";
    return { reply: `Payment policy: ${policy}`, action: null, cartItemId: null, escalated: false };
  }

  // Order / how to order
  if (lowerMsg.includes("order") || lowerMsg.includes("want") || lowerMsg.includes("buy")) {
    const favourites = buyerPrefs.favoriteProducts as string[] | undefined;
    const suggestion = favourites?.length ? ` Based on your past orders, you might want to try ${favourites[0]} again.` : "";
    return {
      reply: `To place an order with ${baker.businessName}, just add items to your cart on their profile page.${suggestion}\n\nWhat would you like to order?`,
      action: null, cartItemId: null, escalated: false,
    };
  }

  // Greeting
  if (lowerMsg.includes("hello") || lowerMsg.includes("hi") || lowerMsg.includes("salam") || lowerMsg.includes("assalam")) {
    const greeting = agentConf.customGreeting ?? `Assalam-o-Alaikum! Welcome to ${baker.businessName}.`;
    const personalNote = memory ? ` Good to hear from you again!` : "";
    const available = products.filter((p) => p.isAvailable);
    return {
      reply: `${greeting}${personalNote} I'm here to help with orders and questions.\n\nWe have ${available.length} items available. Would you like to see our menu?`,
      action: null, cartItemId: null, escalated: false,
    };
  }

  // Specific product lookup
  for (const product of products) {
    if (lowerMsg.includes(product.name.toLowerCase())) {
      if (!product.isAvailable) {
        const alternatives = products.filter((p) => p.isAvailable && p.category === product.category);
        const altText = alternatives.length > 0
          ? ` You might also like: ${alternatives.map((p) => p.name).join(", ")}.`
          : "";
        return { reply: `${product.name} is currently sold out.${altText}`, action: null, cartItemId: null, escalated: false };
      }
      const sizes = (product.sizes as Array<{ label: string; pricePkr: number }>) ?? [];
      const priceStr = sizes.length > 0
        ? `Sizes: ${sizes.map((s) => `${s.label} PKR ${s.pricePkr.toLocaleString()}`).join(", ")}`
        : `PKR ${product.basePricePkr.toLocaleString()}`;
      const leadText = product.leadTimeDays > 0 ? ` Ready in ${product.leadTimeDays} day${product.leadTimeDays > 1 ? "s" : ""}.` : "";
      return {
        reply: `${product.name} is available! ${priceStr}.${leadText}${product.isEgglessAvailable ? " Eggless version available." : ""}\n\nWould you like to add it to your cart?`,
        action: null, cartItemId: null, escalated: false,
      };
    }
  }

  // RAG fallback — use indexed product/policy knowledge when rules miss
  if (ragContext) {
    const topChunk = ragChunks[0];
    const hint = topChunk?.sourceType === "product"
      ? `I found something relevant in our menu:\n\n${topChunk.content.split("\n").slice(0, 4).join("\n")}`
      : `Here's what I know:\n\n${ragContext.split("\n\n")[0]}`;
    return {
      reply: `${hint}${memoryContext ? `\n\n${memoryContext}` : ""}\n\nWould you like to order or need more details?`,
      action: null, cartItemId: null, escalated: false,
    };
  }

  // Default
  return {
    reply: `Thanks for your message!${memoryContext ? " " + memoryContext : ""} I'll let ${baker.businessName} know you reached out. In the meantime, you can browse the full menu on their profile. Is there anything specific you're looking for?`,
    action: null, cartItemId: null, escalated: false,
  };
}

// POST /chat
router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { bakerId, buyerId, message, sessionId } = parsed.data;
  const sid = sessionId ?? `session-${bakerId}-${buyerId ?? 0}-${Date.now()}`;

  // Load buyer memory
  let memory: typeof conversationMemoryTable.$inferSelect | null = null;
  if (buyerId) {
    const [existing] = await db.select().from(conversationMemoryTable)
      .where(and(
        eq(conversationMemoryTable.bakerId, bakerId),
        eq(conversationMemoryTable.buyerId, buyerId)
      ));
    memory = existing ?? null;
  }

  // Save user message
  await db.insert(chatMessagesTable).values({
    bakerId,
    buyerId: buyerId ?? null,
    sessionId: sid,
    role: "user",
    content: message,
  });

  const agentReply = await generateAgentReply(bakerId, buyerId ?? null, message, memory);

  // Save agent reply
  await db.insert(chatMessagesTable).values({
    bakerId,
    buyerId: buyerId ?? null,
    sessionId: sid,
    role: "assistant",
    content: agentReply.reply,
  });

  // Update buyer memory (extract preferences from this message)
  if (buyerId) {
    const updatedPrefs = extractPreferences(message, (memory?.preferences ?? {}) as Record<string, unknown>);
    const newCount = (memory?.messageCount ?? 0) + 2;
    const newSummary = `Last message: "${message.slice(0, 100)}". Agent replied about ${agentReply.escalated ? "escalation" : "query"}.`;
    if (memory) {
      await db.update(conversationMemoryTable)
        .set({ preferences: updatedPrefs, messageCount: newCount, summary: newSummary, lastActiveAt: new Date() })
        .where(eq(conversationMemoryTable.id, memory.id));
    } else {
      await db.insert(conversationMemoryTable)
        .values({ bakerId, buyerId, preferences: updatedPrefs, messageCount: newCount, summary: newSummary, lastActiveAt: new Date() })
        .onConflictDoUpdate({
          target: [conversationMemoryTable.bakerId, conversationMemoryTable.buyerId],
          set: { preferences: updatedPrefs, messageCount: newCount, summary: newSummary, lastActiveAt: new Date() },
        });
    }
  }

  // Notify baker of escalation or new message
  if (agentReply.escalated) {
    await notify(bakerId, "chat_escalation", "Chat escalated", `A buyer flagged an issue: "${message.slice(0, 80)}"`, undefined, "chat");
  } else if (!memory || memory.messageCount === 0) {
    await notify(bakerId, "new_message", "New chat message", `New conversation started on your shop`, undefined, "chat");
  }

  res.json({
    reply: agentReply.reply,
    sessionId: sid,
    action: agentReply.action,
    cartItemId: agentReply.cartItemId,
    escalated: agentReply.escalated,
  });
});

// GET /chat/:bakerId/history/:buyerId
router.get("/chat/:bakerId/history/:buyerId", async (req, res): Promise<void> => {
  const params = GetChatHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const messages = await db.select().from(chatMessagesTable)
    .where(and(
      eq(chatMessagesTable.bakerId, params.data.bakerId),
      eq(chatMessagesTable.buyerId, params.data.buyerId)
    ))
    .orderBy(chatMessagesTable.createdAt);
  res.json(messages);
});

// GET /chat/:bakerId/conversations
router.get("/chat/:bakerId/conversations", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId);
  if (isNaN(bakerId)) { res.status(400).json({ error: "Invalid bakerId" }); return; }

  // Get all conversation memories for this baker
  const memories = await db.select()
    .from(conversationMemoryTable)
    .where(eq(conversationMemoryTable.bakerId, bakerId))
    .orderBy(desc(conversationMemoryTable.lastActiveAt));

  // Also get recent messages from non-memory sessions (anonymous)
  const recentAnon = await db
    .selectDistinctOn([chatMessagesTable.sessionId], {
      sessionId: chatMessagesTable.sessionId,
      bakerId: chatMessagesTable.bakerId,
      buyerId: chatMessagesTable.buyerId,
      lastMessage: chatMessagesTable.content,
      lastActiveAt: chatMessagesTable.createdAt,
    })
    .from(chatMessagesTable)
    .where(and(
      eq(chatMessagesTable.bakerId, bakerId),
      eq(chatMessagesTable.role, "user")
    ))
    .orderBy(chatMessagesTable.sessionId, desc(chatMessagesTable.createdAt));

  // Build conversation summaries
  const conversations = memories.map(m => ({
    buyerId: m.buyerId,
    buyerName: m.buyerName ?? `Buyer #${m.buyerId}`,
    lastMessage: m.summary ?? "No messages yet",
    lastActiveAt: m.lastActiveAt.toISOString(),
    messageCount: m.messageCount,
    unread: false,
    preferences: m.preferences ?? {},
    summary: m.summary,
  }));

  // Add any sessions we don't have memory for (anonymous or first-time)
  const knownBuyerIds = new Set(memories.map(m => m.buyerId));
  for (const msg of recentAnon) {
    if (msg.buyerId && knownBuyerIds.has(msg.buyerId)) continue;
    if (!msg.buyerId) continue; // skip fully anonymous
    conversations.push({
      buyerId: msg.buyerId,
      buyerName: `Buyer #${msg.buyerId}`,
      lastMessage: msg.lastMessage,
      lastActiveAt: msg.lastActiveAt.toISOString(),
      messageCount: 0,
      unread: false,
      preferences: {},
      summary: null,
    });
  }

  res.json(conversations);
});

export default router;
