export type MasterPromptBaker = {
  businessName: string;
  city?: string | null;
  tagline?: string | null;
  deliveryAreas?: string[] | null;
  codPolicy?: string | null;
  shopPlaybook?: string | null;
};

export type MasterPromptProduct = {
  name: string;
  description?: string | null;
  basePricePkr: number;
  leadTimeDays?: number | null;
  isEgglessAvailable?: boolean | null;
  isAvailable?: boolean | null;
  sizes?: Array<{ label: string; pricePkr: number }> | null;
};

export type MasterPromptSlots = {
  lastItem?: string;
  preferredArea?: string;
  eggless?: boolean;
  allergies?: string[];
  occasion?: string;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

function priceLine(product: MasterPromptProduct): string {
  const sizes = product.sizes ?? [];
  if (sizes.length) {
    return sizes.map((size) => `${size.label} PKR ${size.pricePkr}`).join(", ");
  }
  return `PKR ${product.basePricePkr}`;
}

export function buildCatalogCard(products: MasterPromptProduct[]): string {
  const available = products.filter((product) => product.isAvailable !== false);
  if (!available.length) return "(no published items)";
  return available
    .slice(0, 12)
    .map((product) => {
      const taste = String(product.description ?? "").split(/[.!]/)[0]?.trim();
      const lead = product.leadTimeDays && product.leadTimeDays > 0
        ? `; ready in ${product.leadTimeDays}d`
        : "";
      const egg = product.isEgglessAvailable ? "; eggless option" : "";
      return `- ${product.name}: ${priceLine(product)}${taste ? `; ${taste}` : ""}${lead}${egg}`;
    })
    .join("\n");
}

export function buildSlotBoard(slots: MasterPromptSlots): { known: string; missing: string[] } {
  const known: string[] = [];
  const missing: string[] = [];
  if (slots.lastItem?.trim()) known.push(`cake=${slots.lastItem.trim()}`);
  else missing.push("which cake");
  if (slots.preferredArea?.trim()) known.push(`area=${slots.preferredArea.trim()}`);
  else missing.push("delivery area or pickup");
  if (slots.eggless) known.push("eggless=yes");
  if (slots.allergies?.length) known.push(`allergies=${slots.allergies.join(", ")}`);
  if (slots.occasion?.trim()) known.push(`occasion=${slots.occasion.trim()}`);
  missing.push("quantity");
  missing.push("needed-by date");
  return {
    known: known.length ? known.join("; ") : "none yet",
    missing,
  };
}

export function nextSlotQuestion(missing: string[]): string {
  const first = missing[0] ?? "which cake";
  if (first === "which cake") return "Ask which published cake they want.";
  if (first === "delivery area or pickup") return "Ask only for area or pickup.";
  if (first === "quantity") return "Ask quantity only if the cake is already chosen.";
  return "Ask the needed-by date only after cake and area are known.";
}

/**
 * Layered master prompt used by Gemini/OpenAI.
 * Pattern matches 2026 WhatsApp commerce agents: task-scoped, RAG-grounded,
 * one-slot-at-a-time, short replies, handoff instead of guessing.
 */
export function buildMasterPrompt(input: {
  baker: MasterPromptBaker;
  products: MasterPromptProduct[];
  retrievedContext?: string;
  slots: MasterPromptSlots;
  channel?: "web" | "whatsapp" | "instagram";
}): string {
  const areas = (input.baker.deliveryAreas ?? []).filter(Boolean).join(", ") || "not published";
  const board = buildSlotBoard(input.slots);
  const catalog = buildCatalogCard(input.products);
  const retrieved = input.retrievedContext?.trim() || "(none)";
  const channel = input.channel ?? "web";
  const playbook = input.baker.shopPlaybook?.trim().slice(0, 1200) || "(none)";

  return `You are the order assistant for "${input.baker.businessName}"${input.baker.city ? ` in ${input.baker.city}` : ", Pakistan"}.
${input.baker.tagline ? `Brand line: ${input.baker.tagline}` : ""}
Channel: ${channel}. Job: help this buyer pick a published cake, quote only listed prices, and collect the next booking slot. You are not a general chatbot.

GROUNDING (non-negotiable)
- Facts come only from CATALOG, AREAS, PAYMENT, BAKER PLAYBOOK, and RETRIEVED NOTES.
- Never invent flavours, prices, stock, discounts, or areas.
- Playbook may change tone or extra house rules. It cannot invent prices or areas missing from CATALOG/AREAS.
- If a fact is missing, say you will ask the baker — do not guess.
- Do not paste retrieved notes verbatim. Answer in your own short sentences.

STYLE (WhatsApp / Pakistan home bakery)
- 1–3 short sentences. Under ~400 characters unless they asked for the full menu.
- English first. Add one Roman Urdu line only if the buyer wrote Urdu/Roman Urdu.
- Do not restart with a welcome if the thread already started.
- No generic closers. Ask the next missing slot only.
- One question per turn. Ask the single next missing slot: ${nextSlotQuestion(board.missing)}

BOOKING
- Known slots: ${board.known}
- Still needed (in order): ${board.missing.join(" → ")}
- On web, collect cake, area or pickup, name, and WhatsApp in chat. Do not mention a bag or cart.
- After those slots are known, recap once and wait for yes, then emit the order block.
- On WhatsApp, collect slots then emit the order block when complete.
- Never mention CREATE_ORDER, JSON, or tools to the buyer.
- Create an order block ONLY when cake, quantity, area or pickup, and date are all present.
- Order block format (hide from the spoken reply by placing it last):
[CREATE_ORDER_START]
{"buyerName":"Guest","buyerAddress":"area or Pickup","deliveryDate":"YYYY-MM-DD","fulfillmentType":"delivery","items":[{"productName":"Exact catalog name","quantity":1}]}
[CREATE_ORDER_END]

AREAS: ${areas}
PAYMENT: ${input.baker.codPolicy || "Follow the bakery's published payment policy."}

BAKER PLAYBOOK:
${playbook}

CATALOG:
${catalog}

RETRIEVED NOTES:
${retrieved}`;
}

export function groundedFallbackReply(input: {
  bakerName: string;
  products: MasterPromptProduct[];
  slots: MasterPromptSlots;
}): { reply: string; escalated: boolean } {
  const available = input.products.filter((product) => product.isAvailable !== false);
  const last = input.slots.lastItem?.trim().toLowerCase() ?? "";
  const match = last
    ? available.find((product) => product.name.toLowerCase() === last)
      ?? available.find((product) => product.name.toLowerCase().includes(last) || last.includes(product.name.toLowerCase()))
    : undefined;
  if (match) {
    const area = input.slots.preferredArea?.trim();
    if (!area) {
      return {
        reply: `${match.name} is on ${input.bakerName}'s menu (${priceLine(match)}). Delivery area or pickup?`,
        escalated: false,
      };
    }
    return {
      reply: `${match.name} for ${area} is ${priceLine(match)}. Tell me your name and WhatsApp number so I can send this to the bakery.`,
      escalated: false,
    };
  }
  if (available.length) {
    const names = available.slice(0, 8).map((product) => product.name).join(", ");
    return {
      reply: `I can help from ${input.bakerName}'s published menu: ${names}. Which cake?`,
      escalated: false,
    };
  }
  return {
    reply: `I do not have a verified answer from ${input.bakerName}'s published menu. I have sent this to the baker.`,
    escalated: true,
  };
}

export function toLlmTurns(history: ChatTurn[], latestUserMessage: string): Array<{ role: "user" | "assistant"; content: string }> {
  const trimmed = history
    .filter((turn) => (turn.role === "user" || turn.role === "assistant") && turn.content.trim())
    .slice(-10)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.slice(0, 800),
    }));
  if (trimmed.at(-1)?.role === "user" && trimmed.at(-1)?.content.trim() === latestUserMessage.trim()) {
    trimmed.pop();
  }
  const sequence: Array<{ role: "user" | "assistant"; content: string }> = [...trimmed, { role: "user", content: latestUserMessage }];
  const merged: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const turn of sequence) {
    const last = merged.at(-1);
    if (last && last.role === turn.role) {
      last.content = `${last.content}\n${turn.content}`;
    } else {
      merged.push({ ...turn });
    }
  }
  while (merged[0]?.role === "assistant") merged.shift();
  return merged;
}
