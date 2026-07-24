import { eq, and, desc } from "drizzle-orm";
import {
  db,
  chatMessagesTable,
  bakersTable,
  productsTable,
  conversationMemoryTable,
  notificationsTable,
  customersTable,
  ordersTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import { sendN8nEvent } from "./n8n.js";
import { deriveCustomerInsights } from "./customer-insights.js";
import { applyAgentLanguage, normalizeAgentLanguage } from "./agent-language.js";
import { traceAgentTurn } from "./langfuse.js";
import { formatRetrievedContext, retrieveKnowledge } from "./rag/retriever.js";
import { isPlanAccessActive, TRIAL_EXPIRED_BUYER_REPLY } from "./subscription.js";
import { AI_REPLY_CAP_BUYER_REPLY, isAiReplyCapReached } from "./plan-limits.js";

export type AgentReply = {
  reply: string;
  action: string | null;
  cartItemId: number | null;
  escalated: boolean;
};

const MENU_SCOPE_KEYWORDS = [
  "menu", "product", "cake", "cupcake", "cookie", "dessert", "brownie", "pastry", "bake",
  "price", "cost", "pkr", "size", "flavour", "flavor", "variant", "custom", "design",
  "order", "cart", "buy", "book", "delivery", "deliver", "pickup", "area", "sector", "location",
  "available", "stock", "lead time", "today", "tomorrow", "open", "close", "hours",
  "payment", "pay", "cod", "cash", "advance", "receipt", "refund", "cancel", "status",
  "egg", "vegan", "vegetarian", "gluten", "dairy", "nut", "allergy", "allergen", "halal",
  "discount", "offer", "promo", "coupon", "sale", "deal", "ingredient", "recommend", "occasion",
  "birthday", "wedding", "anniversary", "thank", "thanks", "hello", "hi", "salam", "assalam",
  "kya", "kitna", "kitne", "batao", "bata dein", "chahiye", "mangna", "mangwana",
  "meetha", "mithai",
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all |any |the )?(previous|prior|above) (instructions|rules|message)/i,
  /system prompt|developer message|jailbreak|reveal .*prompt/i,
  /act as (?!a bakery|the bakery|an assistant)/i,
  /show (me )?(your|the) (instructions|rules|memory|api key)/i,
];

export function isMenuScopedMessage(message: string, productNames: string[]): boolean {
  const normalized = message.toLowerCase().trim();
  if (!normalized) return false;
  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  if (productNames.some((name) => normalized.includes(name.toLowerCase()))) return true;
  return MENU_SCOPE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function menuScopeRefusal(businessName: string): AgentReply {
  return {
    reply: `I can help only with ${businessName}'s menu, ingredients and dietary labels, prices, availability, orders, delivery, and payment policy. What would you like to know about the bakery?`,
    action: null,
    cartItemId: null,
    escalated: false,
  };
}

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
    const allergy = allergyMatch[1].trim().slice(0, 80);
    if (allergy && !allergies.includes(allergy)) {
      prefs.allergies = [...allergies.slice(0, 4), allergy];
    }
  }
  return prefs;
}

export async function generateAgentReply(
  bakerId: number,
  buyerId: number | null,
  message: string,
  memory: typeof conversationMemoryTable.$inferSelect | null,
  historyPreferences: Record<string, unknown> = {},
): Promise<AgentReply> {
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!baker) return { reply: "Baker not found.", action: null, cartItemId: null, escalated: false };

  if (!isPlanAccessActive(baker)) {
    return {
      reply: TRIAL_EXPIRED_BUYER_REPLY,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  if (!baker.agentActive) {
    return {
      reply: `${baker.businessName}'s assistant is currently unavailable. Please try again later.`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  const replyCap = await isAiReplyCapReached(baker.id, baker.subscriptionPlan);
  if (replyCap.capped) {
    return {
      reply: AI_REPLY_CAP_BUYER_REPLY,
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
    availabilityHours?: string;
    dietaryPolicy?: string;
    activeOffers?: string;
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

  // This deterministic boundary runs before retrieval, custom replies, and the
  // LLM. It prevents prompt injection and keeps every channel limited to the
  // baker's menu and transactional support instead of general chat.
  if (!isMenuScopedMessage(message, products.map((product) => product.name))) {
    return menuScopeRefusal(baker.businessName);
  }

  if (/(allerg|peanut|nut[ -]?free|gluten|dairy|lactose|vegan|halal|cross.?contamin)/.test(lowerMsg)) {
    const dietaryPolicy = agentConf.dietaryPolicy?.trim();
    const eggless = products.filter((product) => product.isAvailable && product.isEgglessAvailable);
    const egglessList = eggless.length ? ` Eggless options currently listed: ${eggless.map((product) => product.name).join(", ")}.` : "";
    return {
      reply: `${dietaryPolicy ? `${dietaryPolicy} ` : "I can share menu details, but I cannot guarantee an item is allergen-safe or free from cross-contact."}${egglessList} For a medical allergy, please confirm directly with ${baker.businessName} before ordering.`,
      action: "escalate",
      cartItemId: null,
      escalated: true,
    };
  }

  if (/(open|close|hours|available today|working today|today open)/.test(lowerMsg)) {
    const hours = agentConf.availabilityHours?.trim();
    return {
      reply: hours
        ? `${baker.businessName}'s availability: ${hours}. For a custom or same-day order, please confirm the required delivery time.`
        : `${baker.businessName}'s availability changes with the baking schedule. Tell me your required date and time, and I’ll help check the menu.`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  if (/(discount|offer|promo|coupon|sale|deal)/.test(lowerMsg)) {
    const offers = agentConf.activeOffers?.trim();
    return {
      reply: offers
        ? `Current offers from ${baker.businessName}: ${offers}`
        : `${baker.businessName} has no published offer right now. I can still help you choose something from the menu.`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  // Rule-based handler for Order Status and Advance Payment verification queries
  if (buyerId && (lowerMsg.includes("status") || lowerMsg.includes("verify") || lowerMsg.includes("receipt") || lowerMsg.includes("screenshot") || lowerMsg.includes("payment") || lowerMsg.includes("advance"))) {
    const [latestOrder] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.buyerId, buyerId), eq(ordersTable.bakerId, bakerId)))
      .orderBy(desc(ordersTable.createdAt))
      .limit(1);

    if (latestOrder) {
      const advancePct = baker.advancePercentage ?? 50;
      const paymentMode = (baker.agentConfig as { paymentMode?: string } | null)?.paymentMode;
      const fullAdvance = paymentMode === "full_advance" || advancePct >= 100;
      const advanceAmountPkr = fullAdvance
        ? latestOrder.totalPkr
        : Math.ceil((latestOrder.totalPkr * advancePct) / 100);
      const advanceLabel = fullAdvance ? "full advance payment" : `${advancePct}% advance deposit`;

      if (latestOrder.requireAdvance) {
        if (latestOrder.advancePaid) {
          return {
            reply: `I checked your Order #${latestOrder.id} status. Good news! Your ${advanceLabel} (PKR ${advanceAmountPkr.toLocaleString()}) has been successfully verified! We've already started preparing your order. Let me know if you need any tweaks.`,
            action: null,
            cartItemId: null,
            escalated: false,
          };
        } else if (latestOrder.paymentScreenshotUrl) {
          return {
            reply: `We've received the transfer receipt or transaction reference for Order #${latestOrder.id}. Payment stays pending until ${baker.businessName} manually confirms the transfer.`,
            action: null,
            cartItemId: null,
            escalated: false,
          };
        } else {
          return {
            reply: `Your Order #${latestOrder.id} is currently pending confirmation. Since the total is PKR ${latestOrder.totalPkr.toLocaleString()}, a ${advanceLabel} (PKR ${advanceAmountPkr.toLocaleString()}) is required. Please transfer using the payment details shared by ${baker.businessName}, then send a receipt screenshot or transaction ID. The baker will manually confirm it.`,
            action: null,
            cartItemId: null,
            escalated: false,
          };
        }
      } else {
        return {
          reply: `Your Order #${latestOrder.id} is confirmed! Since the total is PKR ${latestOrder.totalPkr.toLocaleString()}, no advance deposit is required. You can pay the full amount via Cash on Delivery when it is delivered.`,
          action: null,
          cartItemId: null,
          escalated: false,
        };
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

  // Bakery-authored replies may customise wording, but cannot bypass the
  // global blocked-topic check above.
  if (agentConf.customResponses?.length) {
    for (const cr of agentConf.customResponses) {
      if (lowerMsg.includes(cr.trigger.toLowerCase())) {
        return { reply: cr.response, action: null, cartItemId: null, escalated: false };
      }
    }
  }

  const escalateKeywords = [
    "complain", "problem", "issue", "wrong", "bad",
    ...(agentConf.escalateKeywords ?? []),
  ];
  const hitsEscalate = escalateKeywords.some((raw) => {
    const k = raw.toLowerCase().trim();
    if (!k) return false;
    // Short tokens need word boundaries ("bad" must not match "badam")
    if (k.length <= 3) {
      return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lowerMsg);
    }
    return lowerMsg.includes(k);
  });
  if (hitsEscalate) {
    return {
      reply: `I'm sorry to hear you're having an issue. I've flagged this for ${baker.businessName} and they'll be in touch shortly. You can also reach them directly on WhatsApp.`,
      action: "escalate",
      cartItemId: null,
      escalated: true,
    };
  }

  const buyerPrefs = {
    ...((memory?.preferences ?? {}) as Record<string, unknown>),
    ...historyPreferences,
  };
  // Exact-first policy: the customer-facing answers below come from live
  // bakery records. Unknown questions fail closed to baker confirmation.

  if (
    lowerMsg.includes("price") ||
    lowerMsg.includes("menu") ||
    lowerMsg.includes("what do you have") ||
    lowerMsg.includes("list")
  ) {
    let available = products.filter((p) => p.isAvailable);
    if (buyerPrefs.eggless) available = available.filter((p) => p.isEgglessAvailable);
    const favorites = Array.isArray(buyerPrefs.favoriteProducts)
      ? new Set(buyerPrefs.favoriteProducts as string[])
      : new Set<string>();
    available = [...available].sort(
      (a, b) =>
        Number(favorites.has(b.name)) - Number(favorites.has(a.name)),
    );
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
      : favorites.size > 0
        ? "\n\n(Your past favorites are shown first.)"
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
    lowerMsg.includes("cash") ||
    lowerMsg.includes("advance")
  ) {
    const agentConf = (baker.agentConfig ?? {}) as { paymentMode?: string };
    const mode = agentConf.paymentMode;
    const policy = mode === "full_advance"
      ? "Full advance is required before your order is confirmed."
      : mode === "partial_advance"
        ? `Partial advance (${baker.advancePercentage}%) on orders from PKR ${baker.advanceThresholdPkr.toLocaleString()}. Balance on delivery.`
        : baker.codPolicy ?? "Cash on delivery (COD) only. Full payment required at the time of delivery.";
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
    let personalNote = "";
    if (memory) {
      const prefs = (memory.preferences ?? {}) as Record<string, any>;
      const details: string[] = [];
      if (prefs.eggless) {
        details.push("eggless treats");
      }
      if (prefs.allergies && Array.isArray(prefs.allergies) && prefs.allergies.length > 0) {
        details.push(`allergy to ${prefs.allergies.join(", ")}`);
      }
      if (prefs.preferredArea) {
        details.push(`delivery in ${prefs.preferredArea}`);
      }
      if (prefs.favoriteProducts && Array.isArray(prefs.favoriteProducts) && prefs.favoriteProducts.length > 0) {
        details.push(`favorites like ${prefs.favoriteProducts[0]}`);
      }

      if (details.length > 0) {
        personalNote = ` Good to hear from you again! I still remember your preferences for ${details.join(", ")}, and will make sure to tailor your choices accordingly.`;
      } else {
        personalNote = " Good to hear from you again!";
      }
    }
    const available = products.filter((p) => p.isAvailable);
    return {
      reply: `${greeting}${personalNote} I'm here to help you order or answer any questions.\n\nWe have ${available.length} items available today. Would you like to see our menu?`,
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
      const descriptionText = product.description ? ` ${product.description}` : "";
      const dietaryTags = (product.dietaryTags as string[] | null) ?? [];
      const dietaryText = dietaryTags.length ? ` Dietary labels: ${dietaryTags.join(", ")}.` : "";
      return {
        reply: `${product.name} is available!${descriptionText} ${priceStr}.${leadText}${product.isEgglessAvailable ? " Eggless version available." : ""}${dietaryText}\n\nWould you like to add it to your order?`,
        action: null,
        cartItemId: null,
        escalated: false,
      };
    }
  }

  // RAG fallback — indexed menu/policy chunks when rules miss
  const ragChunks = await retrieveKnowledge(bakerId, message, 3, 0.1);
  const ragContext = formatRetrievedContext(ragChunks);
  if (ragContext) {
    const topChunk = ragChunks[0];
    const hint =
      topChunk?.sourceType === "product"
        ? `I found something relevant on our menu:\n\n${topChunk.content.split("\n").slice(0, 4).join("\n")}`
        : `Here's what I know from ${baker.businessName}'s published info:\n\n${ragContext.split("\n\n")[0]}`;
    return {
      reply: `${hint}\n\nWould you like to order or need more details?`,
      action: "rag",
      cartItemId: null,
      escalated: false,
    };
  }

  return {
    reply: `I do not have a verified answer for that from ${baker.businessName}'s published menu or policies. Please ask the baker to confirm, or ask me about products, prices, dietary labels, delivery, availability, orders, or payment policy.`,
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
  channel?: "web" | "whatsapp" | "instagram";
  buyerWhatsapp?: string;
  buyerExternalId?: string;
};

export type ProcessChatResult = AgentReply & { sessionId: string };

export async function processChatMessage(input: ProcessChatInput): Promise<ProcessChatResult> {
  const startedAt = Date.now();
  const { bakerId } = input;
  const message = input.message.trim().slice(0, 2000);
  if (!message) {
    throw new Error("Message is required");
  }
  let buyerId = input.buyerId ?? null;

  // Resolve a channel-scoped customer identity server-side. Instagram IDs are
  // prefixed so they cannot collide with WhatsApp phone numbers.
  const externalCustomerKey = input.buyerWhatsapp?.trim() ||
    (input.channel === "instagram" && input.buyerExternalId
      ? `instagram:${input.buyerExternalId.trim()}`
      : null);
  if (!buyerId && externalCustomerKey) {
    const [existingCustomer] = await db
      .select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.bakerId, bakerId),
          eq(customersTable.whatsappNumber, externalCustomerKey)
        )
      );

    if (existingCustomer) {
      buyerId = existingCustomer.id;
    } else {
      const [newCustomer] = await db
        .insert(customersTable)
        .values({
          name: input.channel === "instagram"
            ? `Instagram Guest (${externalCustomerKey.slice(-6)})`
            : `WhatsApp Guest (${externalCustomerKey.slice(-4)})`,
          whatsappNumber: externalCustomerKey,
          bakerId,
        })
        .returning();
      buyerId = newCustomer.id;
    }
  }

  const sid =
    input.sessionId?.trim().slice(0, 120) ??
    ((input.channel === "whatsapp" && input.buyerWhatsapp) ||
    (input.channel === "instagram" && input.buyerExternalId)
      ? `${input.channel === "instagram" ? "ig" : "wa"}-${bakerId}-${input.buyerExternalId ?? input.buyerWhatsapp}`
      : `session-${bakerId}-${buyerId ?? 0}-${Date.now()}`);

  let memory: typeof conversationMemoryTable.$inferSelect | null = null;
  let historyPreferences: Record<string, unknown> = {};
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

    const orderHistory = await db
      .select({
        totalPkr: ordersTable.totalPkr,
        buyerArea: ordersTable.buyerArea,
        status: ordersTable.status,
        createdAt: ordersTable.createdAt,
        items: ordersTable.items,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.bakerId, bakerId),
          eq(ordersTable.buyerId, buyerId),
        ),
      );
    historyPreferences = deriveCustomerInsights(orderHistory);
  }

  await db.insert(chatMessagesTable).values({
    bakerId,
    buyerId,
    sessionId: sid,
    role: "user",
    content: message,
  });

  const agentReply = await generateAgentReply(
    bakerId,
    buyerId,
    message,
    memory,
    historyPreferences,
  );

  const [bakerRow] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  const agentLanguage = normalizeAgentLanguage(
    (bakerRow?.agentConfig as { agentLanguage?: string } | null)?.agentLanguage,
  );
  agentReply.reply = applyAgentLanguage(agentReply.reply, agentLanguage, bakerRow?.businessName ?? "Bakery");

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
      {
        ...((memory?.preferences ?? {}) as Record<string, unknown>),
        ...historyPreferences,
      },
    );
    const newCount = (memory?.messageCount ?? 0) + 2;
    // Full chat messages are kept in the bakery inbox. Keep long-term memory
    // minimal and never copy a customer's free-form text into it.
    const newSummary = agentReply.escalated
      ? "Customer needs a baker follow-up."
      : "Recent menu conversation saved.";
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
    const channelLabel =
      input.channel === "whatsapp"
        ? "WhatsApp"
        : input.channel === "instagram"
          ? "Instagram"
          : "your shop";
    await notify(
      bakerId,
      "new_message",
      "New chat message",
      `New conversation started on ${channelLabel}`,
      undefined,
      "chat",
    );
  }

  await sendN8nEvent(agentReply.escalated ? "chat.escalated" : "chat.received", {
    bakerId,
    buyerId,
    sessionId: sid,
    channel: input.channel ?? "web",
    message: message.slice(0, 2000),
    reply: agentReply.reply,
    escalated: agentReply.escalated,
  });

  // Optional free Hobby / self-hosted Langfuse — no-op without keys
  traceAgentTurn({
    bakerId,
    buyerId,
    sessionId: sid,
    channel: input.channel ?? "web",
    message,
    reply: agentReply.reply,
    action: agentReply.action,
    escalated: agentReply.escalated,
    latencyMs: Date.now() - startedAt,
  });

  return { ...agentReply, sessionId: sid };
}
