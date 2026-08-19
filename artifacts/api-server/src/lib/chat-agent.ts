import { eq, and, desc, ne, asc } from "drizzle-orm";
import {
  db,
  chatMessagesTable,
  bakersTable,
  productsTable,
  conversationMemoryTable,
  notificationsTable,
  customersTable,
  ordersTable,
  chatHandoffsTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import { deliveryZoneSummary, findDeliveryZone, normalizeDeliveryZones } from "./delivery-zones.js";
import { sendN8nEvent } from "./n8n.js";
import { deriveCustomerInsights } from "./customer-insights.js";
import { applyAgentLanguage, normalizeAgentLanguage } from "./agent-language.js";
import { traceAgentTurn } from "./langfuse.js";
import { formatRetrievedContext, retrieveKnowledge } from "./rag/retriever.js";
import { isPlanAccessActive, TRIAL_EXPIRED_BUYER_REPLY } from "./subscription.js";
import { AI_REPLY_CAP_BUYER_REPLY, isAiReplyCapReached } from "./plan-limits.js";
import { callLlm } from "./llm.js";
import { answerNeedsHumanConfirmation, isMenuScopedMessage } from "./agent-safety.js";
import { logOrderActivity } from "./audit.js";
import { extractPreferences, foldSessionPreferences, buildMemorySummary } from "./buyer-memory.js";
import {
  findSpokenArea,
  greetingShouldYieldToTask,
  hasBookingConfirmIntent,
  hasFlavorIntent,
  hasGreetingIntent,
  hasOrderIntent,
  hasOrderStatusIntent,
  productsMentionedIn,
  resolveFocusProduct,
  spokenCity,
} from "./agent-intent.js";

export type AgentReply = {
  reply: string;
  action: string | null;
  cartItemId: number | null;
  escalated: boolean;
};

export { isMenuScopedMessage } from "./agent-safety.js";
export { extractPreferences } from "./buyer-memory.js";

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

function productPriceLine(product: typeof productsTable.$inferSelect): string {
  const sizes = (product.sizes as Array<{ label: string; pricePkr: number }> | null) ?? [];
  return sizes.length
    ? sizes.map((size) => `${size.label} — PKR ${size.pricePkr.toLocaleString()}`).join(", ")
    : `PKR ${product.basePricePkr.toLocaleString()}`;
}

function productTasteLine(product: typeof productsTable.$inferSelect): string {
  const ingredients = Array.isArray(product.ingredients)
    ? (product.ingredients as unknown[]).filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  if (ingredients.length) return ingredients.slice(0, 4).join(", ");
  const desc = String(product.description ?? "").split(/[.!]/)[0]?.trim() ?? "";
  return desc;
}

function checkoutReply(input: {
  product: typeof productsTable.$inferSelect;
  area?: string | null;
  areas: string[];
  payment: string;
}): string {
  const lead = input.product.leadTimeDays > 0
    ? ` Ready in ${input.product.leadTimeDays} day${input.product.leadTimeDays === 1 ? "" : "s"}.`
    : "";
  const taste = productTasteLine(input.product);
  const tasteBit = taste ? ` ${taste}.` : "";
  if (!input.area) {
    const areaHint = input.areas.length ? ` We deliver to ${input.areas.join(", ")}.` : "";
    return `${input.product.name} — ${productPriceLine(input.product)}.${tasteBit}${lead}${areaHint} Which area should I use for delivery, or is this pickup?`;
  }
  return `${input.product.name} for ${input.area}: ${productPriceLine(input.product)}.${tasteBit}${lead} Payment: ${input.payment} Add it to your bag on this page, or tell me the quantity and the date you need it.`;
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
  if (
    hasOrderStatusIntent(lowerMsg)
    || (buyerId && (lowerMsg.includes("verify") || lowerMsg.includes("receipt") || lowerMsg.includes("screenshot")))
  ) {
    const [latestOrder] = buyerId
      ? await db
          .select()
          .from(ordersTable)
          .where(and(eq(ordersTable.buyerId, buyerId), eq(ordersTable.bakerId, bakerId)))
          .orderBy(desc(ordersTable.createdAt))
          .limit(1)
      : [];

    if (!latestOrder) {
      return {
        reply: `I don't have an order on this chat yet. Add items to your bag on this page, or tell me which cake you want and your delivery area.`,
        action: null,
        cartItemId: null,
        escalated: false,
      };
    }
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

  if (agentConf.blockedTopics?.some((t) => lowerMsg.includes(t.toLowerCase()))) {
    return {
      reply: `I'm sorry, I can't help with that. I've kept this conversation for ${baker.businessName} to review. Please use the bakery's published contact details if you need a personal reply.`,
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
      reply: `I'm sorry to hear you're having an issue. I've flagged this in ${baker.businessName}'s dashboard so the baker can follow up.`,
      action: "escalate",
      cartItemId: null,
      escalated: true,
    };
  }

  const buyerPrefs = {
    ...((memory?.preferences ?? {}) as Record<string, unknown>),
    ...historyPreferences,
  };
  const deliveryAreas = baker.deliveryAreas ?? [];
  const lastAssistantText = typeof buyerPrefs.lastAssistantText === "string" ? buyerPrefs.lastAssistantText : "";
  const paymentMode = (baker.agentConfig as { paymentMode?: string } | null)?.paymentMode;
  const paymentPolicy = paymentMode === "full_advance"
    ? "Full advance is required before your order is confirmed."
    : paymentMode === "partial_advance"
      ? `Partial advance (${baker.advancePercentage}%) on orders from PKR ${baker.advanceThresholdPkr.toLocaleString()}. Balance on delivery.`
      : baker.codPolicy ?? "Cash on delivery (COD) only. Full payment required at the time of delivery.";
  // Exact-first policy: the customer-facing answers below come from live
  // bakery records. Unknown questions fail closed to baker confirmation.

  if (/(human|real person|team member|speak (to|with).*(baker|person)|ask (the )?baker|baker.*confirm|person.*confirm)/.test(lowerMsg)) {
    return {
      reply: `I have sent your question to ${baker.businessName}'s human team. A person can review the conversation and reply here without you repeating the details.`,
      action: "escalate",
      cartItemId: null,
      escalated: true,
    };
  }

  const remembered = [
    typeof buyerPrefs.lastItem === "string" && buyerPrefs.lastItem.trim()
      ? `you asked about ${buyerPrefs.lastItem.trim()}`
      : "",
    typeof buyerPrefs.preferredArea === "string" && buyerPrefs.preferredArea.trim()
      ? `delivery in ${buyerPrefs.preferredArea.trim()}`
      : "",
    buyerPrefs.eggless ? "eggless" : "",
  ].filter(Boolean);
  if (
    remembered.length > 0 &&
    /(what did i|do you remember|which area did i|my (last |previous )?(order|request|cake))/.test(lowerMsg)
  ) {
    return {
      reply: `I still have ${remembered.join(" and ")}. Tell me if anything should change, or say the product name to see price and lead time.`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  // Published catalogue items win over the generic custom-cake form, so a
  // "Fondant Wedding Cake" on the menu is never treated as an unpriced sketch.
  const lastItem = typeof buyerPrefs.lastItem === "string" ? buyerPrefs.lastItem.toLowerCase().trim() : "";
  const focusProduct = resolveFocusProduct(message, products, lastItem, lastAssistantText);
  const mentionedProduct = products.find((product) =>
    lowerMsg.includes(product.name.toLowerCase()),
  ) ?? (focusProduct
    ? products.find((product) => product.id === (focusProduct as { id?: number }).id)
      ?? products.find((product) => product.name === focusProduct.name)
    : undefined);

  if (hasFlavorIntent(lowerMsg)) {
    const available = products.filter((product) => product.isAvailable);
    if (available.length === 0) {
      return {
        reply: `${baker.businessName} does not have cakes listed yet. Please ask the baker for flavours.`,
        action: null,
        cartItemId: null,
        escalated: false,
      };
    }
    const list = available
      .map((product) => {
        const taste = productTasteLine(product);
        return `• *${product.name}* — ${productPriceLine(product)}${taste ? `. ${taste}` : ""}`;
      })
      .join("\n");
    return {
      reply: `Here's what is on ${baker.businessName}'s menu (flavours are whatever the baker wrote for each cake — I don't invent extra ones):\n\n${list}\n\nWhich cake would you like?`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  if (
    /(custom (cake|order|design)|theme cake|photo cake|logo cake|sculpted cake|3d cake)/.test(lowerMsg)
    && !mentionedProduct
  ) {
    return {
      reply: `I can help ${baker.businessName} prepare a custom-order request. Please share the occasion/design, required date and time, number of servings, flavour, eggless/dietary needs, and delivery or pickup area. The baker will confirm the final price and availability.`,
      action: "escalate",
      cartItemId: null,
      escalated: true,
    };
  }

  // Handle a named product before a generic "price" or "menu" request. This
  // prevents a customer asking "what is the price of Chocolate Cake?" from
  // receiving an unhelpful full catalogue instead of the exact product facts.
  if (mentionedProduct) {
    if (!mentionedProduct.isAvailable) {
      const alternatives = products.filter(
        (product) => product.isAvailable && product.category === mentionedProduct.category,
      );
      const alternativeText = alternatives.length
        ? ` Available alternatives: ${alternatives.map((product) => product.name).join(", ")}.`
        : " Please ask the baker when it will be available again.";
      return {
        reply: `${mentionedProduct.name} is currently unavailable.${alternativeText}`,
        action: null,
        cartItemId: null,
        escalated: false,
      };
    }

    const spokenArea = findSpokenArea(message, deliveryAreas)
      ?? (typeof buyerPrefs.preferredArea === "string" ? buyerPrefs.preferredArea : null);
    if (hasOrderIntent(lowerMsg) || hasBookingConfirmIntent(lowerMsg)) {
      return {
        reply: checkoutReply({
          product: mentionedProduct,
          area: spokenArea,
          areas: deliveryAreas,
          payment: paymentPolicy,
        }),
        action: null,
        cartItemId: mentionedProduct.id,
        escalated: false,
      };
    }

    const leadTime = mentionedProduct.leadTimeDays > 0
      ? ` Preparation time: ${mentionedProduct.leadTimeDays} day${mentionedProduct.leadTimeDays === 1 ? "" : "s"}.`
      : "";
    const dietaryTags = (mentionedProduct.dietaryTags as string[] | null) ?? [];
    const dietary = dietaryTags.length ? ` Dietary labels: ${dietaryTags.join(", ")}.` : "";
    const eggless = mentionedProduct.isEgglessAvailable ? " An eggless version is available." : "";
    const taste = productTasteLine(mentionedProduct);
    return {
      reply: `${mentionedProduct.name} is available. ${productPriceLine(mentionedProduct)}.${taste ? ` ${taste}.` : ""}${leadTime}${eggless}${dietary} Would you like to order it, or check delivery for your area?`,
      action: null,
      cartItemId: mentionedProduct.id,
      escalated: false,
    };
  }

  const spokenArea = findSpokenArea(message, deliveryAreas)
    ?? (typeof buyerPrefs.preferredArea === "string" ? buyerPrefs.preferredArea : null);
  const city = spokenCity(message);
  const asksDelivery = lowerMsg.includes("deliver") || lowerMsg.includes("area") || lowerMsg.includes("location");
  if (
    (lowerMsg.includes("price") && !asksDelivery) ||
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

  if (asksDelivery || city) {
    const areas = (baker.deliveryAreas ?? []).join(", ");
    const agentConf = (baker.agentConfig ?? {}) as { deliveryPricing?: unknown; deliveryZones?: unknown; allowDelivery?: unknown };
    if (agentConf.allowDelivery === false) {
      return {
        reply: `${baker.businessName} is currently offering pickup only. Please ask the baker to confirm whether delivery can be arranged for your order.`,
        action: null,
        cartItemId: null,
        escalated: false,
      };
    }
    const deliveryPricing = typeof agentConf.deliveryPricing === "string" ? agentConf.deliveryPricing.trim() : "";
    const deliveryZones = normalizeDeliveryZones(agentConf.deliveryZones);
    // Prefer the area in this message. Memory is only a fallback, so a buyer
    // changing from DHA to Gulberg never receives an outdated delivery quote.
    const matchedZone = findDeliveryZone(deliveryZones, message)
      ?? findDeliveryZone(deliveryZones, String(buyerPrefs.preferredArea ?? ""));
    const zonePricing = matchedZone
      ? ` Delivery to ${matchedZone.name} is PKR ${matchedZone.feePkr.toLocaleString()}${matchedZone.minimumOrderPkr ? ` (minimum order PKR ${matchedZone.minimumOrderPkr.toLocaleString()})` : ""}.`
      : deliveryZones.length ? ` Delivery zones and charges: ${deliveryZoneSummary(deliveryZones)}.` : "";
    const personalNote =
      buyerPrefs.preferredArea &&
      areas.toLowerCase().includes((buyerPrefs.preferredArea as string).toLowerCase())
        ? ` Great news — we deliver to ${buyerPrefs.preferredArea}!`
        : "";
    const areaFollowUp = spokenArea || buyerPrefs.preferredArea
      ? " Pickup is also available."
      : " Pickup is also available. Which area are you in?";
    const cityNote = city && baker.city && baker.city.toLowerCase() === city.toLowerCase()
      ? ` Yes — ${baker.businessName} is in ${baker.city}. Tell me the area (for example ${deliveryAreas.slice(0, 2).join(" or ") || "your sector"}).`
      : city && baker.city && baker.city.toLowerCase() !== city.toLowerCase()
        ? ` Published delivery is in ${baker.city}: ${areas || "ask the baker"}. I cannot confirm ${city} unless the baker lists it.`
        : "";
    return {
      reply: areas
        ? `${baker.businessName} delivers to: ${areas}.${zonePricing || (deliveryPricing ? ` Delivery charges: ${deliveryPricing}.` : "")}${personalNote}${cityNote || areaFollowUp}`
        : `${baker.businessName} has not published delivery areas yet. I cannot confirm delivery or invent a fee; please use the bakery's published contact details to ask the baker.`,
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
    return { reply: `Payment policy: ${paymentPolicy}`, action: null, cartItemId: null, escalated: false };
  }

  if (hasOrderIntent(lowerMsg) || hasBookingConfirmIntent(lowerMsg)) {
    const available = products.filter((product) => product.isAvailable);
    const names = available.map((product) => product.name).join(", ");
    if (spokenArea && !focusProduct) {
      return {
        reply: `${spokenArea} is in ${baker.businessName}'s delivery areas. Which cake should I put down — ${names || "tell me the item from the menu"}?`,
        action: null,
        cartItemId: null,
        escalated: false,
      };
    }
    const favourites = buyerPrefs.favoriteProducts as string[] | undefined;
    const suggestion = favourites?.length
      ? ` Based on your past orders, you might want to try ${favourites[0]} again.`
      : "";
    return {
      reply: `Which cake would you like from ${baker.businessName}? ${names ? `On the menu: ${names}.` : ""}${suggestion} Then tell me delivery area or pickup.`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  if (hasGreetingIntent(lowerMsg) && !greetingShouldYieldToTask(message, deliveryAreas)) {
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
      if (typeof prefs.bakerNote === "string" && prefs.bakerNote.trim()) {
        details.push(prefs.bakerNote.trim().slice(0, 80));
      }

      if (details.length > 0) {
        personalNote = ` Good to hear from you again! I still remember your preferences for ${details.join(", ")}, and will make sure to tailor your choices accordingly.`;
      } else {
        personalNote = " Good to hear from you again!";
      }
    }
    const available = products.filter((p) => p.isAvailable);
    return {
      reply: `${greeting}${personalNote} I'm here to help you order or answer questions from the bakery's published menu.\n\nWe currently have ${available.length} items listed as available. Would you like to see the menu?`,
      action: null,
      cartItemId: null,
      escalated: false,
    };
  }

  // RAG fallback — indexed menu/policy chunks when rules miss
  const ragChunks = await retrieveKnowledge(bakerId, message, 3, 0.1);
  const ragContext = formatRetrievedContext(ragChunks);
  if (ragContext) {
    // Attempt generative LLM response using free Gemini API or OpenAI if keys are configured
    const systemPrompt = `You are a friendly, helpful AI assistant for the home-based bakery "${baker.businessName}" in ${baker.city || "Pakistan"}.
Your goal is to answer customer questions about the bakery's menu, pricing, ingredients, dietary policies, delivery, and availability.

Strict Guidelines:
1. ONLY answer based on the provided menu, products, and policies in the "Retrieved Context" below. Do not assume or hallucinate any details.
2. If the user's question cannot be answered by the context, explain politely that you don't have that information and ask them to confirm with the baker directly.
3. Keep replies helpful and bilingual (in a natural blend of English and Urdu, e.g. using "Assalam-o-Alaikum", "PKR", etc. where appropriate).
4. Do NOT make up products, prices, or delivery areas.
5. AUTOMATED ORDERING:
   If the customer explicitly requests to place an order, AND has specified: (a) what items they want, (b) the quantity, (c) the delivery address (or pickup), and (d) the delivery date, you MUST append a structured order JSON command block at the very end of your response.
   If any of these details are missing, politely ask the customer for the missing details first and do NOT output the block.
   Format the block exactly as:
   [CREATE_ORDER_START]
   {
     "buyerName": "Customer Name",
     "buyerAddress": "Customer Address (or 'Pickup' if fulfillment is pickup)",
     "deliveryDate": "YYYY-MM-DD (parsed target date)",
     "fulfillmentType": "delivery" or "pickup",
     "items": [
       { "productName": "Matching Product Name", "quantity": 1 }
     ]
   }
   [CREATE_ORDER_END]

Bakery Branding:
- Name: ${baker.businessName}
- Tagline: ${baker.tagline || ""}
- Areas: ${(baker.deliveryAreas ?? []).join(", ")}
- Payment Policy: ${baker.codPolicy || "Manual transfer / Cash on Delivery"}

Retrieved Context (Menu & Policies):
${ragContext}

Customer Preferences (if known):
- Preferred Area: ${buyerPrefs.preferredArea || "None specified"}
- Eggless Preference: ${buyerPrefs.eggless ? "Eggless Only" : "Standard"}
- Allergies: ${Array.isArray(buyerPrefs.allergies) ? buyerPrefs.allergies.join(", ") : "None specified"}`;

    const llmReply = await callLlm([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    if (llmReply) {
      const needsHuman = answerNeedsHumanConfirmation(llmReply);
      return {
        reply: needsHuman
          ? `${llmReply}\n\nI have also sent this to the bakery's human inbox for confirmation.`
          : llmReply,
        action: needsHuman ? "escalate" : "llm_generative",
        cartItemId: null,
        escalated: needsHuman,
      };
    }

    // Fallback to raw text hint if LLM key is not configured or fails
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
    reply: `I do not have a verified answer for that from ${baker.businessName}'s published menu or policies. I have sent this question to a human team member, who can reply here.`,
    action: "escalate",
    cartItemId: null,
    escalated: true,
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

  const [bakerForMemory] = await db
    .select({ deliveryAreas: bakersTable.deliveryAreas })
    .from(bakersTable)
    .where(eq(bakersTable.id, bakerId))
    .limit(1);
  const sessionTurns = await db
    .select({ content: chatMessagesTable.content })
    .from(chatMessagesTable)
    .where(and(
      eq(chatMessagesTable.bakerId, bakerId),
      eq(chatMessagesTable.sessionId, sid),
      eq(chatMessagesTable.role, "user"),
    ))
    .orderBy(asc(chatMessagesTable.id))
    .limit(30);
  const catalogNames = await db
    .select({ name: productsTable.name })
    .from(productsTable)
    .where(eq(productsTable.bakerId, bakerId));
  historyPreferences = foldSessionPreferences(
    sessionTurns.map((turn) => turn.content),
    historyPreferences,
    bakerForMemory?.deliveryAreas ?? [],
    catalogNames.map((row) => row.name),
  );
  const assistantTurns = await db
    .select({ content: chatMessagesTable.content })
    .from(chatMessagesTable)
    .where(and(
      eq(chatMessagesTable.bakerId, bakerId),
      eq(chatMessagesTable.sessionId, sid),
      eq(chatMessagesTable.role, "assistant"),
    ))
    .orderBy(desc(chatMessagesTable.id))
    .limit(8);
  const lastSingleProductReply = assistantTurns.find(
    (turn) => productsMentionedIn(turn.content, catalogNames).length === 1,
  );
  historyPreferences.lastAssistantText = lastSingleProductReply?.content ?? assistantTurns[0]?.content ?? "";

  const [activeHandoff] = await db.select({ id: chatHandoffsTable.id })
    .from(chatHandoffsTable)
    .where(and(
      eq(chatHandoffsTable.bakerId, bakerId),
      eq(chatHandoffsTable.sessionId, sid),
      ne(chatHandoffsTable.status, "resolved"),
    ))
    .limit(1);

  // Once a human owns the conversation, do not let the bot compete with or
  // contradict that person. New buyer messages stay in the same inbox thread.
  const agentReply = activeHandoff
    ? {
        reply: "Your message has been added to the human support conversation. A bakery team member will reply here.",
        action: "awaiting_human",
        cartItemId: null,
        escalated: false,
      }
    : await generateAgentReply(
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

  // Check for automated order commands in the reply
  const orderMatch = agentReply.reply.match(/\[CREATE_ORDER_START\]\s*([\s\S]*?)\s*\[CREATE_ORDER_END\]/);
  if (orderMatch) {
    try {
      const orderData = JSON.parse(orderMatch[1]);
      const products = await db.select().from(productsTable).where(eq(productsTable.bakerId, bakerId));

      const lineItems: any[] = [];
      let totalPkr = 0;

      for (const item of orderData.items || []) {
        const p = products.find(
          (product) => product.name.toLowerCase() === item.productName.toLowerCase()
        ) || products.find(
          (product) => product.name.toLowerCase().includes(item.productName.toLowerCase())
        );

        if (p) {
          const qty = parseInt(item.quantity, 10) || 1;
          const price = p.basePricePkr;
          lineItems.push({
            productId: p.id,
            productName: p.name,
            quantity: qty,
            unitPricePkr: price,
            sizeLabel: "Standard",
          });
          totalPkr += price * qty;
        }
      }

      if (lineItems.length > 0) {
        // Resolve delivery fee if fulfillment is delivery
        let deliveryFee = 0;
        if (orderData.fulfillmentType === "delivery" && orderData.buyerAddress) {
          const zones = normalizeDeliveryZones((bakerRow?.agentConfig as Record<string, unknown> | null)?.deliveryZones);
          const zone = findDeliveryZone(zones, orderData.buyerAddress);
          if (zone) {
            deliveryFee = zone.feePkr;
          }
        }
        totalPkr += deliveryFee;

        let customerName = orderData.buyerName || "Guest Buyer";
        let customerAddress = orderData.buyerAddress || "Delivery Address";
        let customerWhatsapp = input.buyerWhatsapp || "";

        if (buyerId) {
          const [cust] = await db.select().from(customersTable).where(eq(customersTable.id, buyerId)).limit(1);
          if (cust) {
            if (cust.name) customerName = cust.name;
            if (cust.whatsappNumber) customerWhatsapp = cust.whatsappNumber;
          }
        }

        const [order] = await db.insert(ordersTable).values({
          bakerId,
          buyerId,
          buyerName: customerName,
          buyerWhatsapp: customerWhatsapp,
          buyerAddress: customerAddress,
          buyerArea: orderData.buyerArea || null,
          items: lineItems,
          totalPkr,
          deliveryDate: orderData.deliveryDate || null,
          fulfillmentType: orderData.fulfillmentType || "delivery",
          source: input.channel || "whatsapp",
          status: "new",
          paymentStatus: "pending",
          requireAdvance: Boolean(bakerRow?.requireAdvance),
        }).returning();

        // Log order activity
        await logOrderActivity({
          orderId: order.id,
          bakerId: order.bakerId,
          actor: { actorType: "system" },
          action: "status_change",
          fromStatus: null,
          toStatus: "new",
          metadata: { source: order.source },
        });

        // Notify baker
        await notify(
          bakerId,
          "new_order",
          "New Chat Order",
          `Order #${order.id} for PKR ${totalPkr.toLocaleString()} was placed by ${customerName} via ${input.channel || "chat"}.`,
          order.id,
          "order"
        );

        // Strip order commands block from output text
        agentReply.reply = agentReply.reply.replace(/\[CREATE_ORDER_START\][\s\S]*?\[CREATE_ORDER_END\]/, "").trim();
        
        // Append confirmation text
        const confirmMsg = `\n\n*(Note: I have recorded your order request for ${order.fulfillmentType} on ${order.deliveryDate || "selected date"}. Order ID: #${order.id}. The baker will confirm your order details shortly!)*`;
        agentReply.reply = agentReply.reply + confirmMsg;
      }
    } catch (err) {
      logger.error({ err }, "Failed to automatically parse and record chat order");
    }
  }

  await db.insert(chatMessagesTable).values({
    bakerId,
    buyerId,
    sessionId: sid,
    role: "assistant",
    content: agentReply.reply,
  });

  if (agentReply.escalated) {
    await db
      .insert(chatHandoffsTable)
      .values({
        bakerId,
        buyerId,
        sessionId: sid,
        status: "open",
        reason: message.slice(0, 500),
      })
      .onConflictDoUpdate({
        target: [chatHandoffsTable.bakerId, chatHandoffsTable.sessionId],
        set: {
          buyerId,
          status: "open",
          reason: message.slice(0, 500),
          resolvedAt: null,
          updatedAt: new Date(),
        },
      });
  }

  if (buyerId) {
    const [bakerRow] = await db
      .select({ deliveryAreas: bakersTable.deliveryAreas })
      .from(bakersTable)
      .where(eq(bakersTable.id, bakerId))
      .limit(1);
    const updatedPrefs = extractPreferences(
      message,
      {
        ...((memory?.preferences ?? {}) as Record<string, unknown>),
        ...historyPreferences,
      },
      bakerRow?.deliveryAreas ?? [],
      catalogNames.map((row) => row.name),
    );
    delete updatedPrefs.lastAssistantText;
    const newCount = (memory?.messageCount ?? 0) + 2;
    const newSummary = buildMemorySummary({
      previousSummary: memory?.summary,
      preferences: updatedPrefs,
      escalated: agentReply.escalated,
    });
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
      buyerId ?? undefined,
      `chat:${sid}`,
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
      buyerId ?? undefined,
      `chat:${sid}`,
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
