import { eq, and } from "drizzle-orm";
import {
  db,
  chatMessagesTable,
  bakersTable,
  productsTable,
  conversationMemoryTable,
  notificationsTable,
} from "@workspace/db";
import { logger } from "./logger";
import { formatRetrievedContext, retrieveKnowledge } from "./rag/retriever";

export type AgentReply = {
  reply: string;
  action: string | null;
  cartItemId: number | null;
  escalated: boolean;
};

async function notify(
  bakerId: number,
  type: string,
  title: string,
  message: string,
  relatedId?: number,
  relatedType?: string,
) {
  try {
    await db.insert(notificationsTable).values({
      bakerId,
      type,
      title,
      message,
      relatedId: relatedId ?? null,
      relatedType: relatedType ?? null,
    });
  } catch (e) {
    logger.error({ err: e }, "Failed to create notification");
  }
}

export function extractPreferences(message: string, existing: Record<string, unknown>) {
  const prefs: Record<string, unknown> = { ...existing };
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("eggless") || lowerMsg.includes("no egg")) {
    prefs.eggless = true;
  }
  const areaMatches = [
    "dha", "gulberg", "clifton", "defence", "bahria", "johar", "model town",
    "cavalry", "cantt", "f-7", "f-8", "f-10", "g-9",
  ];
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

export async function generateAgentReply(
  bakerId: number,
  buyerId: number | null,
  message: string,
  memory: typeof conversationMemoryTable.$inferSelect | null,
): Promise<AgentReply> {
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!baker) return { reply: "Baker not found.", action: null, cartItemId: null, escalated: false };

  if (!baker.agentActive) {
    return {
      reply: `${baker.businessName}'s assistant is currently unavailable. Please try again later.`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  const agentConf = (baker.agentConfig ?? {}) as {
    customGreeting?: string;
    blockedTopics?: string[];
    escalateKeywords?: string[];
    autoReplyEnabled?: boolean;
    customResponses?: Array<{ trigger: string; response: string }>;
  };

  if (agentConf.autoReplyEnabled === false) {
    return {
      reply: `Thanks for your message! ${baker.businessName} will reply personally soon.`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  const products = await db.select().from(productsTable).where(eq(productsTable.bakerId, bakerId));
  const lowerMsg = message.toLowerCase();
  const ragChunks = await retrieveKnowledge(bakerId, message, 3, 0.1);
  const ragContext = formatRetrievedContext(ragChunks);

  if (agentConf.customResponses?.length) {
    for (const cr of agentConf.customResponses) {
      if (lowerMsg.includes(cr.trigger.toLowerCase())) {
        return { reply: cr.response, action: null, cartItemId: null, escalated: false };
      }
    }
  }

  if (agentConf.blockedTopics?.some((t) => lowerMsg.includes(t.toLowerCase()))) {
    return {
      reply: `I'm sorry, I can't help with that. Please contact ${baker.businessName} directly on WhatsApp for more information.`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  const escalateKeywords = [
    "complain", "problem", "issue", "wrong", "bad",
    ...(agentConf.escalateKeywords ?? []),
  ];
  if (escalateKeywords.some((k) => lowerMsg.includes(k))) {
    return {
      reply: `I'm sorry to hear you're having an issue. I've flagged this for ${baker.businessName} and they'll be in touch shortly. You can also reach them directly on WhatsApp.`,
      action: "escalate",
      cartItemId: null,
      escalated: true,
    };
  }

  const buyerPrefs = (memory?.preferences ?? {}) as Record<string, unknown>;
  const memoryContext = memory
    ? [
        buyerPrefs.eggless ? "This customer prefers eggless items." : "",
        buyerPrefs.preferredArea ? `They are usually in ${buyerPrefs.preferredArea}.` : "",
        buyerPrefs.favoriteProducts
          ? `Their favourites: ${(buyerPrefs.favoriteProducts as string[]).join(", ")}.`
          : "",
        buyerPrefs.allergies
          ? `ALLERGIES: ${(buyerPrefs.allergies as string[]).join(", ")} — never suggest these.`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  if (
    lowerMsg.includes("price") ||
    lowerMsg.includes("menu") ||
    lowerMsg.includes("what do you have") ||
    lowerMsg.includes("list")
  ) {
    let available = products.filter((p) => p.isAvailable);
    if (buyerPrefs.eggless) available = available.filter((p) => p.isEgglessAvailable);
    if (available.length === 0) {
      return {
        reply: `${baker.businessName} doesn't have any ${buyerPrefs.eggless ? "eggless " : ""}products listed yet.`,
        action: null,
        cartItemId: null,
        escalated: false,
      };
    }
    const list = available
      .map((p) => {
        const sizes = (p.sizes as Array<{ label: string; pricePkr: number }>) ?? [];
        const priceStr =
          sizes.length > 0
            ? sizes.map((s) => `${s.label}: PKR ${s.pricePkr.toLocaleString()}`).join(", ")
            : `PKR ${p.basePricePkr.toLocaleString()}`;
        return `• *${p.name}* — ${priceStr}${p.isEgglessAvailable ? " (eggless available)" : ""}`;
      })
      .join("\n");
    const personalNote = buyerPrefs.eggless
      ? "\n\n(Showing eggless items only based on your preference)"
      : "";
    return {
      reply: `Here's ${baker.businessName}'s menu:\n\n${list}${personalNote}\n\nWhat would you like to order?`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  if (lowerMsg.includes("eggless") || lowerMsg.includes("egg")) {
    const eggless = products.filter((p) => p.isEgglessAvailable && p.isAvailable);
    if (eggless.length === 0) {
      return {
        reply: `Unfortunately, ${baker.businessName} doesn't offer eggless options at the moment.`,
        action: null,
        cartItemId: null,
        escalated: false,
      };
    }
    const list = eggless.map((p) => `• ${p.name}`).join("\n");
    return {
      reply: `Great news! These items are available eggless:\n\n${list}\n\nWould you like to order any of these?`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  if (lowerMsg.includes("deliver") || lowerMsg.includes("area") || lowerMsg.includes("location")) {
    const areas = (baker.deliveryAreas ?? []).join(", ");
    const personalNote =
      buyerPrefs.preferredArea &&
      areas.toLowerCase().includes((buyerPrefs.preferredArea as string).toLowerCase())
        ? ` Great news — we deliver to ${buyerPrefs.preferredArea}!`
        : "";
    return {
      reply: areas
        ? `${baker.businessName} delivers to: ${areas}.${personalNote} Pickup is also available. Which area are you in?`
        : `Please contact ${baker.businessName} directly on WhatsApp to confirm delivery to your area.`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  if (
    lowerMsg.includes("pay") ||
    lowerMsg.includes("payment") ||
    lowerMsg.includes("cod") ||
    lowerMsg.includes("cash")
  ) {
    const policy =
      baker.codPolicy ?? "Cash on delivery (COD) only. Full payment required at the time of delivery.";
    return { reply: `Payment policy: ${policy}`, action: null, cartItemId: null, escalated: false };
  }

  if (lowerMsg.includes("order") || lowerMsg.includes("want") || lowerMsg.includes("buy")) {
    const favourites = buyerPrefs.favoriteProducts as string[] | undefined;
    const suggestion = favourites?.length
      ? ` Based on your past orders, you might want to try ${favourites[0]} again.`
      : "";
    return {
      reply: `To place an order with ${baker.businessName}, tell me what you'd like and your delivery area.${suggestion}\n\nWhat would you like to order?`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  if (
    lowerMsg.includes("hello") ||
    lowerMsg.includes("hi") ||
    lowerMsg.includes("salam") ||
    lowerMsg.includes("assalam")
  ) {
    const greeting = agentConf.customGreeting ?? `Assalam-o-Alaikum! Welcome to ${baker.businessName}.`;
    const personalNote = memory ? " Good to hear from you again!" : "";
    const available = products.filter((p) => p.isAvailable);
    return {
      reply: `${greeting}${personalNote} I'm here to help with orders and questions.\n\nWe have ${available.length} items available. Would you like to see our menu?`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  for (const product of products) {
    if (lowerMsg.includes(product.name.toLowerCase())) {
      if (!product.isAvailable) {
        const alternatives = products.filter(
          (p) => p.isAvailable && p.category === product.category,
        );
        const altText =
          alternatives.length > 0
            ? ` You might also like: ${alternatives.map((p) => p.name).join(", ")}.`
            : "";
        return {
          reply: `${product.name} is currently sold out.${altText}`,
          action: null,
          cartItemId: null,
          escalated: false,
        };
      }
      const sizes = (product.sizes as Array<{ label: string; pricePkr: number }>) ?? [];
      const priceStr =
        sizes.length > 0
          ? `Sizes: ${sizes.map((s) => `${s.label} PKR ${s.pricePkr.toLocaleString()}`).join(", ")}`
          : `PKR ${product.basePricePkr.toLocaleString()}`;
      const leadText =
        product.leadTimeDays > 0
          ? ` Ready in ${product.leadTimeDays} day${product.leadTimeDays > 1 ? "s" : ""}.`
          : "";
      return {
        reply: `${product.name} is available! ${priceStr}.${leadText}${product.isEgglessAvailable ? " Eggless version available." : ""}\n\nWould you like to add it to your order?`,
        action: null,
        cartItemId: null,
        escalated: false,
      };
    }
  }

  if (ragContext) {
    const topChunk = ragChunks[0];
    const hint =
      topChunk?.sourceType === "product"
        ? `I found something relevant in our menu:\n\n${topChunk.content.split("\n").slice(0, 4).join("\n")}`
        : `Here's what I know:\n\n${ragContext.split("\n\n")[0]}`;
    return {
      reply: `${hint}${memoryContext ? `\n\n${memoryContext}` : ""}\n\nWould you like to order or need more details?`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  return {
    reply: `Thanks for your message!${memoryContext ? ` ${memoryContext}` : ""} I'll let ${baker.businessName} know you reached out. Is there anything specific you're looking for?`,
    action: null,
    cartItemId: null,
    escalated: false,
  };
}

export type ProcessChatInput = {
  bakerId: number;
  buyerId?: number | null;
  message: string;
  sessionId?: string;
  channel?: "web" | "whatsapp";
  buyerWhatsapp?: string;
};

export type ProcessChatResult = AgentReply & { sessionId: string };

export async function processChatMessage(input: ProcessChatInput): Promise<ProcessChatResult> {
  const { bakerId, message } = input;
  const buyerId = input.buyerId ?? null;
  const sid =
    input.sessionId ??
    (input.channel === "whatsapp" && input.buyerWhatsapp
      ? `wa-${bakerId}-${input.buyerWhatsapp}`
      : `session-${bakerId}-${buyerId ?? 0}-${Date.now()}`);

  let memory: typeof conversationMemoryTable.$inferSelect | null = null;
  if (buyerId) {
    const [existing] = await db
      .select()
      .from(conversationMemoryTable)
      .where(
        and(
          eq(conversationMemoryTable.bakerId, bakerId),
          eq(conversationMemoryTable.buyerId, buyerId),
        ),
      );
    memory = existing ?? null;
  }

  await db.insert(chatMessagesTable).values({
    bakerId,
    buyerId,
    sessionId: sid,
    role: "user",
    content: message,
  });

  const agentReply = await generateAgentReply(bakerId, buyerId, message, memory);

  await db.insert(chatMessagesTable).values({
    bakerId,
    buyerId,
    sessionId: sid,
    role: "assistant",
    content: agentReply.reply,
  });

  if (buyerId) {
    const updatedPrefs = extractPreferences(
      message,
      (memory?.preferences ?? {}) as Record<string, unknown>,
    );
    const newCount = (memory?.messageCount ?? 0) + 2;
    const newSummary = `Last message: "${message.slice(0, 100)}". Agent replied about ${agentReply.escalated ? "escalation" : "query"}.`;
    if (memory) {
      await db
        .update(conversationMemoryTable)
        .set({
          preferences: updatedPrefs,
          messageCount: newCount,
          summary: newSummary,
          lastActiveAt: new Date(),
        })
        .where(eq(conversationMemoryTable.id, memory.id));
    } else {
      await db
        .insert(conversationMemoryTable)
        .values({
          bakerId,
          buyerId,
          preferences: updatedPrefs,
          messageCount: newCount,
          summary: newSummary,
          lastActiveAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [conversationMemoryTable.bakerId, conversationMemoryTable.buyerId],
          set: {
            preferences: updatedPrefs,
            messageCount: newCount,
            summary: newSummary,
            lastActiveAt: new Date(),
          },
        });
    }
  }

  if (agentReply.escalated) {
    await notify(
      bakerId,
      "chat_escalation",
      "Chat escalated",
      `A buyer flagged an issue: "${message.slice(0, 80)}"`,
      undefined,
      "chat",
    );
  } else if (!memory || memory.messageCount === 0) {
    const channelLabel = input.channel === "whatsapp" ? "WhatsApp" : "your shop";
    await notify(
      bakerId,
      "new_message",
      "New chat message",
      `New conversation started on ${channelLabel}`,
      undefined,
      "chat",
    );
  }

  return { ...agentReply, sessionId: sid };
}
