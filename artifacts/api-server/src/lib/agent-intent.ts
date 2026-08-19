const CITY_NAMES = [
  "karachi",
  "lahore",
  "islamabad",
  "rawalpindi",
  "peshawar",
  "quetta",
  "faisalabad",
  "multan",
  "hyderabad",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasWord(haystack: string, word: string): boolean {
  if (!word.trim()) return false;
  return new RegExp(`\\b${escapeRegExp(word.trim())}\\b`, "i").test(haystack);
}

export function hasGreetingIntent(message: string): boolean {
  return /\b(hi|hello|hey|salam|assalam|assalamualaikum|aoa)\b/i.test(message.trim());
}

export function hasOrderIntent(message: string): boolean {
  return /\b(order|ordr|want|wnat|wanna|need|buy|book|checkout|confirm)\b/i.test(message)
    || /\b(chahiye|mangwa|order kar)\b/i.test(message);
}

export function hasBookingConfirmIntent(message: string): boolean {
  const trimmed = message.trim();
  return /^(yes|yeah|yep|ok|okay|haan|han|sure)\b/i.test(trimmed)
    || /\bbook( it)?\b/i.test(trimmed)
    || /\border( it)?\b/i.test(trimmed)
    || /\badd (it|that|this)\b/i.test(trimmed)
    || /\b(that one|this one|the cake|their cake|theri cake)\b/i.test(trimmed);
}

export function hasFlavorIntent(message: string): boolean {
  return /\bflavo/i.test(message)
    || /\bfilling\b|\bsponge\b/i.test(message)
    || /\bwhat (cakes?|items?) (do you )?(have|offer|sell)\b/i.test(message);
}

export function hasOrderStatusIntent(message: string): boolean {
  return /\b(order status|my order|track( my)? order|where is my order)\b/i.test(message)
    || (/\bstatus\b/i.test(message) && /\b(order|payment|advance)\b/i.test(message));
}

export function spokenCity(message: string): string | null {
  const hit = CITY_NAMES.find((city) => hasWord(message, city));
  return hit ? hit[0].toUpperCase() + hit.slice(1) : null;
}

export function findSpokenArea(message: string, areas: string[]): string | null {
  for (const area of areas) {
    const needle = area.trim();
    if (needle.length >= 3 && hasWord(message, needle.replace(/-/g, " "))) return area;
    if (needle.length >= 3 && message.toLowerCase().includes(needle.toLowerCase())) return area;
  }
  return null;
}

export type CatalogProduct = { name: string };

export function productsMentionedIn(text: string, products: CatalogProduct[]): CatalogProduct[] {
  const lower = text.toLowerCase();
  return products.filter((product) => lower.includes(product.name.toLowerCase()));
}

/** Prefer an explicit name in this message, then a single product the assistant just named. */
export function resolveFocusProduct(
  message: string,
  products: CatalogProduct[],
  lastItem?: string,
  lastAssistantText?: string,
): CatalogProduct | null {
  const namedNow = productsMentionedIn(message, products);
  if (namedNow.length === 1) return namedNow[0];

  const last = lastItem?.trim().toLowerCase() ?? "";
  if (last) {
    const exact = products.find((product) => product.name.toLowerCase() === last);
    if (exact) return exact;
    const partial = products.find(
      (product) => product.name.toLowerCase().includes(last) || last.includes(product.name.toLowerCase()),
    );
    if (partial) return partial;
  }

  const namedBefore = lastAssistantText ? productsMentionedIn(lastAssistantText, products) : [];
  if (namedBefore.length === 1) return namedBefore[0];
  if (
    namedBefore.length > 1
    && hasBookingConfirmIntent(message)
    && !/\b(the|their|theri|that|this) cake\b/i.test(message)
  ) {
    return null;
  }
  if (namedBefore.length > 0 && /\b(the|their|theri|that|this) cake\b/i.test(message)) {
    return namedBefore[namedBefore.length - 1];
  }
  return null;
}

export function greetingShouldYieldToTask(message: string, deliveryAreas: string[] = []): boolean {
  return hasOrderIntent(message)
    || hasFlavorIntent(message)
    || hasOrderStatusIntent(message)
    || hasBookingConfirmIntent(message)
    || Boolean(spokenCity(message))
    || Boolean(findSpokenArea(message, deliveryAreas))
    || /\b(deliver|delivery|pickup|menu|price|payment)\b/i.test(message)
    || /\bflavo/i.test(message);
}
