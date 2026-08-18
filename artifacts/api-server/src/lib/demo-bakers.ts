/** Shared demo bakery catalog for seed, enrich, and login copy. */
export const DEMO_PASSWORDS: Record<string, string> = {
  "sana-sweet-studio": "SanaSweet2026!",
  "fatima-cakery": "FatimaCake2026!",
  "amna-bakes": "AmnaBakes2026!",
};

export const DEMO_SLUGS = ["sana-sweet-studio", "fatima-cakery", "amna-bakes"] as const;
export type DemoSlug = (typeof DEMO_SLUGS)[number];

export type DemoProductSeed = {
  name: string;
  description: string;
  basePricePkr: number;
  recipeCostPkr: number;
  sizes: Array<{ label: string; pricePkr: number }>;
  isEgglessAvailable: boolean;
  leadTimeDays: number;
  category: string;
  occasionTags: string[];
  dietaryTags: string[];
  ingredients: string[];
  allergens: string[];
  photoUrl: string;
  isBestSeller: boolean;
  isTopRated: boolean;
  displayOrder: number;
};

export type DemoBakerProfile = {
  businessName: string;
  ownerName: string;
  tagline: string;
  bio: string;
  city: string;
  area: string;
  whatsappNumber: string;
  email: string;
  deliveryAreas: string[];
  phoneBase: string;
  channels: { wa: boolean; ig: boolean };
  subscriptionPlan: string;
  agentActive: boolean;
  whatsappAgentEnabled: boolean;
  instagramAgentEnabled: boolean;
  trialDays: number | null;
  photoUrl: string;
  greeting: string;
  products: DemoProductSeed[];
};

export const DEMO_BAKER_PROFILES: Record<DemoSlug, DemoBakerProfile> = {
  "sana-sweet-studio": {
    businessName: "Sana's Sweet Studio",
    ownerName: "Sana Malik",
    tagline: "Ghar ka meetha, dil se banaya",
    bio: "Home baker from Gulberg, Lahore. Specialising in custom cakes, cupcakes, and Pakistani mithai-inspired fusion desserts.",
    city: "Lahore",
    area: "Gulberg",
    whatsappNumber: "+923001234567",
    email: "sana@studio.com",
    deliveryAreas: ["Gulberg", "Model Town", "DHA Phase 1", "Johar Town"],
    phoneBase: "+92300123",
    channels: { wa: true, ig: true },
    subscriptionPlan: "bakery_plus",
    agentActive: true,
    whatsappAgentEnabled: true,
    instagramAgentEnabled: true,
    trialDays: null,
    photoUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop",
    greeting: "Assalam-o-Alaikum! Sana's Sweet Studio â€” cakes, cupcakes aur fusion mithai. Kya chahiye?",
    products: [
      {
        name: "Classic Black Forest Cake",
        description: "Moist chocolate sponge, fresh cream, and cherries.",
        basePricePkr: 2800,
        recipeCostPkr: 950,
        sizes: [
          { label: "Half Kg", pricePkr: 2800 },
          { label: "1 Kg", pricePkr: 5200 },
        ],
        isEgglessAvailable: true,
        leadTimeDays: 1,
        category: "Cakes",
        occasionTags: ["Birthday", "Anniversary"],
        dietaryTags: [],
        ingredients: ["chocolate sponge", "fresh cream", "cherries"],
        allergens: ["dairy", "gluten", "eggs"],
        photoUrl: "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=600&auto=format&fit=crop",
        isBestSeller: true,
        isTopRated: true,
        displayOrder: 1,
      },
      {
        name: "Red Velvet Cupcakes",
        description: "Velvety cupcakes with cream-cheese frosting.",
        basePricePkr: 1200,
        recipeCostPkr: 380,
        sizes: [
          { label: "Box of 6", pricePkr: 1200 },
          { label: "Box of 12", pricePkr: 2200 },
        ],
        isEgglessAvailable: false,
        leadTimeDays: 1,
        category: "Cupcakes",
        occasionTags: ["Birthday", "Party"],
        dietaryTags: [],
        ingredients: ["cocoa", "cream cheese", "flour"],
        allergens: ["dairy", "gluten", "eggs"],
        photoUrl: "https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=600&auto=format&fit=crop",
        isBestSeller: true,
        isTopRated: false,
        displayOrder: 2,
      },
    ],
  },
  "fatima-cakery": {
    businessName: "Fatima's Cakery",
    ownerName: "Fatima Zahra",
    tagline: "Every bite tells a story",
    bio: "Premium custom cakes for your most special moments. Based in Karachi's Clifton.",
    city: "Karachi",
    area: "Clifton",
    whatsappNumber: "+923219876543",
    email: "fatima@cakery.com",
    deliveryAreas: ["Clifton", "Defence", "Bahadurabad", "Gulshan-e-Iqbal"],
    phoneBase: "+92321876",
    channels: { wa: true, ig: false },
    subscriptionPlan: "starter",
    agentActive: true,
    whatsappAgentEnabled: true,
    instagramAgentEnabled: false,
    trialDays: null,
    photoUrl: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&auto=format&fit=crop",
    greeting: "Welcome to Fatima's Cakery â€” wedding & celebration cakes in Clifton.",
    products: [
      {
        name: "Fondant Wedding Cake",
        description: "Elegant multi-tier custom wedding cakes with hand-crafted sugar flowers.",
        basePricePkr: 15000,
        recipeCostPkr: 6200,
        sizes: [
          { label: "2 Tier (2 Kg)", pricePkr: 15000 },
          { label: "3 Tier (4 Kg)", pricePkr: 28000 },
        ],
        isEgglessAvailable: true,
        leadTimeDays: 7,
        category: "Wedding Cakes",
        occasionTags: ["Wedding", "Nikah"],
        dietaryTags: [],
        ingredients: ["vanilla sponge", "fondant", "sugar flowers"],
        allergens: ["dairy", "gluten", "eggs"],
        photoUrl: "https://images.unsplash.com/photo-1549298651-0e5b3a0e9ca3?w=600&auto=format&fit=crop",
        isBestSeller: true,
        isTopRated: true,
        displayOrder: 1,
      },
      {
        name: "Strawberry Shortcake",
        description: "Light vanilla sponge with fresh strawberries and whipped cream.",
        basePricePkr: 2500,
        recipeCostPkr: 780,
        sizes: [
          { label: "Half Kg", pricePkr: 2500 },
          { label: "1 Kg", pricePkr: 4500 },
        ],
        isEgglessAvailable: false,
        leadTimeDays: 1,
        category: "Cakes",
        occasionTags: ["Birthday", "Casual"],
        dietaryTags: [],
        ingredients: ["vanilla sponge", "strawberries", "cream"],
        allergens: ["dairy", "gluten", "eggs"],
        photoUrl: "https://images.unsplash.com/photo-1488477304112-4944851de03d?w=600&auto=format&fit=crop",
        isBestSeller: true,
        isTopRated: false,
        displayOrder: 2,
      },
    ],
  },
  "amna-bakes": {
    businessName: "Amna Bakes",
    ownerName: "Amna Sheikh",
    tagline: "Simple ingredients, extraordinary taste",
    bio: "Home baker specialising in brownies, cookies, and classic Pakistani sweets. Available in F-7 and F-8, Islamabad.",
    city: "Islamabad",
    area: "F-7",
    whatsappNumber: "+923115554321",
    email: "amna@bakes.com",
    deliveryAreas: ["F-7", "F-8", "G-9", "Blue Area"],
    phoneBase: "+92311555",
    channels: { wa: false, ig: false },
    subscriptionPlan: "free",
    agentActive: false,
    whatsappAgentEnabled: false,
    instagramAgentEnabled: false,
    trialDays: 3,
    photoUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop",
    greeting: "Hi! Browse Amna Bakes menu â€” cookies, banana bread, and more.",
    products: [
      {
        name: "Chocolate Chip Cookies",
        description: "Classic chocolate chip cookies. Crispy edges, chewy centre.",
        basePricePkr: 700,
        recipeCostPkr: 220,
        sizes: [
          { label: "Box of 12", pricePkr: 700 },
          { label: "Box of 24", pricePkr: 1300 },
        ],
        isEgglessAvailable: false,
        leadTimeDays: 1,
        category: "Cookies",
        occasionTags: ["Casual", "Gift"],
        dietaryTags: [],
        ingredients: ["flour", "butter", "chocolate chips"],
        allergens: ["gluten", "dairy", "eggs"],
        photoUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop",
        isBestSeller: true,
        isTopRated: true,
        displayOrder: 1,
      },
      {
        name: "Eggless Banana Bread",
        description: "Moist banana bread â€” fully eggless.",
        basePricePkr: 850,
        recipeCostPkr: 260,
        sizes: [{ label: "Loaf (500g)", pricePkr: 850 }],
        isEgglessAvailable: true,
        leadTimeDays: 1,
        category: "Breads",
        occasionTags: ["Casual", "Breakfast"],
        dietaryTags: ["Eggless", "Vegetarian"],
        ingredients: ["banana", "flour", "oil"],
        allergens: ["gluten"],
        photoUrl: "https://images.unsplash.com/photo-1585478259715-1c195ae2b568?w=600&auto=format&fit=crop",
        isBestSeller: false,
        isTopRated: true,
        displayOrder: 2,
      },
    ],
  },
};

/** Public demo bakery passwords from the catalog. Used so login still works if hashes go stale. */
export function demoPasswordForIdentifier(identifier: string): string | null {
  const value = identifier.trim().toLowerCase();
  for (const slug of DEMO_SLUGS) {
    const profile = DEMO_BAKER_PROFILES[slug];
    if (profile.email === value || profile.whatsappNumber.replace(/\s/g, "") === identifier.trim().replace(/\s/g, "")) {
      return DEMO_PASSWORDS[slug];
    }
  }
  return null;
}
