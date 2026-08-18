export const PRODUCT_CATEGORIES = [
  "Cakes",
  "Cupcakes",
  "Brownies",
  "Cookies",
  "Desserts",
  "Breads",
  "Savory",
  "Other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

const LEGACY_CATEGORY_ALIASES: Record<string, ProductCategory> = {
  "Wedding Cakes": "Cakes",
  "Wedding Cake": "Cakes",
  "Dessert Boxes": "Desserts",
  "Dessert Box": "Desserts",
  "Cup Cake": "Cupcakes",
  "Cup Cakes": "Cupcakes",
  Brownie: "Brownies",
  Cookie: "Cookies",
  Dessert: "Desserts",
  Bread: "Breads",
  Savoury: "Savory",
};

export const DIETARY_LABELS = [
  "Egg-free",
  "Vegan",
  "Vegetarian",
  "Gluten-free",
  "Dairy-free",
  "Nut-free",
  "Sugar-free",
  "Halal",
] as const;

export const ALLERGEN_LABELS = [
  "Contains eggs",
  "Contains dairy",
  "Contains gluten",
  "Contains nuts",
  "Contains soy",
  "Contains sesame",
] as const;

export const LABEL_CONFLICTS: Record<string, string[]> = {
  "Egg-free": ["Contains eggs"],
  "Contains eggs": ["Egg-free"],
  "Dairy-free": ["Contains dairy"],
  "Contains dairy": ["Dairy-free"],
  "Gluten-free": ["Contains gluten"],
  "Contains gluten": ["Gluten-free"],
  "Nut-free": ["Contains nuts"],
  "Contains nuts": ["Nut-free"],
  Vegan: ["Contains eggs", "Contains dairy"],
};

export const MAX_PRODUCT_PRICE_PKR = 999_999;
export const MAX_PRODUCT_DESCRIPTION_CHARS = 280;
export const MAX_BAKER_NOTE_CHARS = 160;
export const MAX_ORDERS_PER_DAY = 200;

export function coerceProductCategory(category?: string | null): ProductCategory {
  const titled = toTitleCase(category ?? "");
  const exact = PRODUCT_CATEGORIES.find((item) => item.toLowerCase() === titled.toLowerCase());
  if (exact) return exact;
  return LEGACY_CATEGORY_ALIASES[titled] ?? LEGACY_CATEGORY_ALIASES[(category ?? "").trim()] ?? "Other";
}

export function toTitleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (!word) return word;
      if (word === word.toUpperCase() && word.length <= 3) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function applyLabelToggle(current: string[], label: string): string[] {
  const has = current.includes(label);
  const next = has ? current.filter((item) => item !== label) : [...current, label];
  const blocked = new Set(LABEL_CONFLICTS[label] ?? []);
  return has ? next : next.filter((item) => !blocked.has(item));
}

export function parseMoneyPkr(value: string | number, max = MAX_PRODUCT_PRICE_PKR): number | null {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0 || value > max) return null;
    return value;
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) return null;
  return parsed;
}
