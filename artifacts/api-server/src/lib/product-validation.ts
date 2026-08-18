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

export const MAX_PRODUCT_PRICE_PKR = 999_999;
export const MAX_PRODUCT_DESCRIPTION_CHARS = 280;

const LABEL_CONFLICTS: Record<string, string[]> = {
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

export function firstFriendlyZodIssue(error: { issues?: Array<{ message: string }> }): string {
  return error.issues?.[0]?.message ?? "Please check the form and try again.";
}

export function sanitizeProductFields(input: {
  name?: string;
  description?: string | null;
  category?: string;
  basePricePkr?: number;
  recipeCostPkr?: number | null;
  dietaryTags?: string[];
  allergens?: string[];
  photoUrl?: string | null;
}): { error?: string; value?: Record<string, unknown> } {
  const value: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const name = toTitleCase(input.name);
    if (name.length < 2 || name.length > 80) {
      return { error: "Product name must be between 2 and 80 characters." };
    }
    value.name = name;
  }

  if (input.description !== undefined) {
    const description = (input.description ?? "").trim();
    if (description.length > MAX_PRODUCT_DESCRIPTION_CHARS) {
      return { error: `Description must be ${MAX_PRODUCT_DESCRIPTION_CHARS} characters or fewer.` };
    }
    value.description = description || null;
  }

  if (input.category !== undefined) {
    if (!PRODUCT_CATEGORIES.includes(input.category as (typeof PRODUCT_CATEGORIES)[number])) {
      return { error: "Choose a category from the list." };
    }
    value.category = input.category;
  }

  if (input.basePricePkr !== undefined) {
    if (!Number.isInteger(input.basePricePkr) || input.basePricePkr < 1 || input.basePricePkr > MAX_PRODUCT_PRICE_PKR) {
      return { error: `Price must be a whole number from PKR 1 to PKR ${MAX_PRODUCT_PRICE_PKR.toLocaleString()}.` };
    }
    value.basePricePkr = input.basePricePkr;
  }

  if (input.recipeCostPkr !== undefined) {
    if (input.recipeCostPkr === null) {
      value.recipeCostPkr = null;
    } else if (!Number.isInteger(input.recipeCostPkr) || input.recipeCostPkr < 0 || input.recipeCostPkr > MAX_PRODUCT_PRICE_PKR) {
      return { error: `Recipe cost must be a whole number from PKR 0 to PKR ${MAX_PRODUCT_PRICE_PKR.toLocaleString()}.` };
    } else {
      value.recipeCostPkr = input.recipeCostPkr;
    }
  }

  if (input.dietaryTags !== undefined || input.allergens !== undefined) {
    const dietaryTags = [...(input.dietaryTags ?? [])];
    const allergens = [...(input.allergens ?? [])];
    const combined = [...dietaryTags, ...allergens];
    for (const label of combined) {
      const conflicts = LABEL_CONFLICTS[label] ?? [];
      if (conflicts.some((item) => combined.includes(item))) {
        return { error: `“${label}” cannot be combined with a contradictory label.` };
      }
    }
    if (input.dietaryTags !== undefined) value.dietaryTags = dietaryTags;
    if (input.allergens !== undefined) value.allergens = allergens;
    if (dietaryTags.includes("Egg-free")) value.isEgglessAvailable = true;
    if (allergens.includes("Contains eggs")) value.isEgglessAvailable = false;
  }

  if (input.photoUrl !== undefined) {
    const photoUrl = (input.photoUrl ?? "").trim();
    if (!photoUrl) value.photoUrl = null;
    else if (!/^https?:\/\//i.test(photoUrl) && !photoUrl.startsWith("data:image/")) {
      return { error: "Product photo must be an image URL or an uploaded image." };
    } else {
      value.photoUrl = photoUrl.slice(0, 2000);
    }
  }

  return { value };
}
