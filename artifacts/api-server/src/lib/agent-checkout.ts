import { normalizePakistanPhone } from "./phone.js";

export type CheckoutSlots = {
  productName?: string;
  quantity: number;
  area?: string;
  pickup: boolean;
  neededByDate?: string;
  buyerName?: string;
  buyerWhatsapp?: string;
};

const CHECKOUT_RECAP_MARK = "Reply yes to send this to the bakery";

export function karachiDatePlusDays(days: number): string {
  const ms = Date.now() + Math.max(0, days) * 86_400_000;
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}

export function isCheckoutRecap(text: string): boolean {
  return text.includes(CHECKOUT_RECAP_MARK);
}

export function isCheckoutFollowUp(lastAssistant: string): boolean {
  return /which area|delivery area or pickup|your (full )?name|what name|whatsapp|needed by|send this to the bakery|start the order/i.test(
    lastAssistant,
  );
}

function titleName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function parseNeededByDate(message: string): string | undefined {
  const iso = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const lower = message.toLowerCase();
  if (/\btomorrow\b/.test(lower)) return karachiDatePlusDays(1);
  if (/\btoday\b/.test(lower)) return karachiDatePlusDays(0);
  const dmy = message.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);
  if (!dmy) return undefined;
  const day = Number(dmy[1]);
  const month = Number(dmy[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  const yearRaw = dmy[3];
  const year = yearRaw
    ? (yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw))
    : Number(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }).slice(0, 4));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function slotsFromPreferences(prefs: Record<string, unknown>, fallbackProduct?: string): CheckoutSlots {
  const quantity = typeof prefs.quantity === "number" && prefs.quantity >= 1 && prefs.quantity <= 20
    ? prefs.quantity
    : 1;
  return {
    productName: typeof prefs.lastItem === "string" && prefs.lastItem.trim()
      ? prefs.lastItem.trim()
      : fallbackProduct,
    quantity,
    area: typeof prefs.preferredArea === "string" && prefs.preferredArea.trim()
      ? prefs.preferredArea.trim()
      : undefined,
    pickup: prefs.pickup === true,
    neededByDate: typeof prefs.neededByDate === "string" ? prefs.neededByDate : undefined,
    buyerName: typeof prefs.buyerName === "string" && prefs.buyerName.trim()
      ? prefs.buyerName.trim()
      : undefined,
    buyerWhatsapp: typeof prefs.buyerWhatsapp === "string" ? prefs.buyerWhatsapp : undefined,
  };
}

/** Fill name/phone/date when the buyer answers the last assistant question in a short line. */
export function applyFollowUpAnswer(
  message: string,
  lastAssistant: string,
  prefs: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...prefs };
  const trimmed = message.trim();
  if (!trimmed) return next;

  const phone = normalizePakistanPhone(trimmed);
  if (phone) next.buyerWhatsapp = phone;

  if (/your (full )?name|what name|put on the order/i.test(lastAssistant) && !/\d/.test(trimmed) && trimmed.split(/\s+/).length <= 4) {
    if (!/^(yes|yeah|yep|ok|okay|haan|han|sure|hi|hello|hey)$/i.test(trimmed)) {
      next.buyerName = titleName(trimmed);
    }
  }

  const date = parseNeededByDate(trimmed);
  if (date && /needed by|date|which day/i.test(lastAssistant)) {
    next.neededByDate = date;
  }

  if (/\bpickup\b|\bcollect\b/i.test(trimmed)) next.pickup = true;
  return next;
}

export function missingCheckoutSlot(slots: CheckoutSlots): "cake" | "area" | "name" | "whatsapp" | null {
  if (!slots.productName?.trim()) return "cake";
  if (!slots.pickup && !slots.area?.trim()) return "area";
  if (!slots.buyerName?.trim()) return "name";
  if (!slots.buyerWhatsapp) return "whatsapp";
  return null;
}

export function nextCheckoutQuestion(missing: ReturnType<typeof missingCheckoutSlot>, bakerName: string, areas: string[]): string {
  if (missing === "cake") return `Which cake from ${bakerName} should I send to the baker?`;
  if (missing === "area") {
    const hint = areas.length ? ` We deliver to ${areas.join(", ")}.` : "";
    return `Delivery area or pickup?${hint}`;
  }
  if (missing === "name") return "What name should the bakery put on the order?";
  return "WhatsApp number for the baker to confirm (03xx xxxxxxx)?";
}

export function checkoutRecap(input: {
  bakerName: string;
  productName: string;
  priceLine: string;
  slots: CheckoutSlots;
  leadTimeDays?: number | null;
}): string {
  const when = input.slots.neededByDate
    ?? karachiDatePlusDays(Math.max(1, input.leadTimeDays ?? 1));
  const where = input.slots.pickup ? "pickup" : input.slots.area;
  return `${input.slots.quantity}× ${input.productName} (${input.priceLine}) for ${where}, needed by ${when}. Name: ${input.slots.buyerName}. ${CHECKOUT_RECAP_MARK}.`;
}

export function createOrderCommandBlock(input: {
  slots: CheckoutSlots;
  productName: string;
  leadTimeDays?: number | null;
}): string {
  const date = input.slots.neededByDate
    ?? karachiDatePlusDays(Math.max(1, input.leadTimeDays ?? 1));
  const pickup = input.slots.pickup;
  const address = pickup
    ? "Pickup from bakery"
    : (input.slots.area && input.slots.area.length >= 5 ? input.slots.area : `${input.slots.area ?? "Guest"}, delivery`);
  return `[CREATE_ORDER_START]
{"buyerName":${JSON.stringify(input.slots.buyerName ?? "Guest")},"buyerWhatsapp":${JSON.stringify(input.slots.buyerWhatsapp ?? "")},"buyerAddress":${JSON.stringify(address)},"buyerArea":${JSON.stringify(pickup ? null : input.slots.area ?? null)},"deliveryDate":${JSON.stringify(date)},"fulfillmentType":${JSON.stringify(pickup ? "pickup" : "delivery")},"items":[{"productName":${JSON.stringify(input.productName)},"quantity":${input.slots.quantity}}]}
[CREATE_ORDER_END]`;
}
