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
  "meetha", "mithai", "قیمت", "آرڈر", "آرڈر", "ڈیلیوری", "کیک", "انڈا", "دستیاب", "پتہ",
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all |any |the )?(previous|prior|above) (instructions|rules|message)/i,
  /system prompt|developer message|jailbreak|reveal .*prompt/i,
  /act as (?!a bakery|the bakery|an assistant)/i,
  /show (me )?(your|the) (instructions|rules|memory|api key)/i,
];

/**
 * Keeps the customer agent restricted to facts the bakery can fulfil. This is
 * deliberately deterministic so a prompt cannot persuade the agent to answer
 * outside its menu, policy, order, or delivery scope.
 */
export function isMenuScopedMessage(message: string, productNames: string[]): boolean {
  const normalized = message.toLowerCase().trim();
  if (!normalized || normalized.length > 2_000) return false;
  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  if (productNames.some((name) => normalized.includes(name.toLowerCase()))) return true;
  if (/\b(karachi|lahore|islamabad|rawalpindi|clifton|defence|dha)\b/i.test(normalized)) return true;
  return MENU_SCOPE_KEYWORDS.some((keyword) => {
    if (keyword.length <= 3 && /^[a-z]+$/i.test(keyword)) {
      return new RegExp(`\\b${keyword}\\b`, "i").test(normalized);
    }
    return normalized.includes(keyword.toLowerCase());
  });
}

/** Detects an answer that admits the retrieved bakery facts are insufficient. */
export function answerNeedsHumanConfirmation(answer: string): boolean {
  return /(confirm (with|from) (the )?baker|ask (the )?baker|do not have|don't have|not (in|available from) (the )?(context|information)|cannot confirm|can't confirm)/i.test(answer);
}
