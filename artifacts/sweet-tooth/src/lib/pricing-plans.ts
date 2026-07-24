/**
 * Sweet Tooth offers — small / medium / large bakers × channel agents × billing period.
 */

export type PlanId = "free" | "starter" | "pro" | "bakery_plus";
export type BakerSize = "small" | "medium" | "large";
export type ChannelBundle = "web_only" | "whatsapp_only" | "instagram_only" | "whatsapp_instagram";
export type BillingPeriod = "monthly" | "semiannual" | "yearly" | "quarterly";

export interface PricingPlan {
  id: PlanId;
  name: string;
  nameUr?: string;
  tagline: string;
  monthlyPkr: number;
  founderQuarterlyPkr: number;
  featured?: boolean;
  commissionPercent: number;
  commissionCapPkr: number;
  extraReplyPkr: number;
  aiRepliesPerMonth: number;
  whatsappConversationsPerMonth: number;
  maxOrdersPerMonth: number;
  maxProducts: number | null;
  staffLogins: number;
  features: string[];
  limits: {
    products: string;
    aiReplies: string;
    orders: string;
    channels: string;
    whatsappChats: string;
  };
}

/** Full catalogue of product services (shown on marketing offers) */
export const APP_SERVICES = [
  { id: "menu", label: "Branded menu link & QR code" },
  { id: "web_agent", label: "Built-in web chat agent (Urdu / Roman Urdu)" },
  { id: "orders", label: "Order inbox & guest checkout" },
  { id: "payment", label: "COD / advance payment settings & proof review" },
  { id: "crm", label: "Customer CRM (regulars & at-risk)" },
  { id: "analytics", label: "Sales analytics & weekly summary" },
  { id: "khata", label: "Khata, inventory & recipe margin" },
  { id: "calendar", label: "Calendar, blocked dates & capacity" },
  { id: "whatsapp", label: "WhatsApp Business agent" },
  { id: "instagram", label: "Instagram DM agent" },
  { id: "broadcast", label: "Flash drops & customer broadcast" },
  { id: "advance_wa", label: "Advance payment WhatsApp reminders" },
  { id: "feedback", label: "Delivery feedback on WhatsApp" },
  { id: "staff", label: "Priority onboarding (staff logins coming soon)" },
  { id: "support", label: "Priority onboarding support" },
] as const;

export type AppServiceId = (typeof APP_SERVICES)[number]["id"];

export type OfferPlan = {
  id: string;
  planId: PlanId;
  size: BakerSize;
  channelBundle: ChannelBundle;
  name: string;
  sizeLabel: string;
  tagline: string;
  monthlyPkr: number;
  /** Agent / AI replies included per month */
  aiRepliesPerMonth: number;
  /** Total buyer conversation chats (all channels) */
  chatsPerMonth: number;
  whatsappChatsPerMonth: number;
  instagramChatsPerMonth: number;
  maxOrdersPerMonth: number;
  maxProducts: number | null;
  staffLogins: number;
  commissionPercent: number;
  commissionCapPkr: number;
  extraReplyPkr: number;
  featured?: boolean;
  serviceIds: AppServiceId[];
  chatNote: string;
};

export const BAKER_SIZE_OPTIONS: Array<{ value: BakerSize; label: string; hint: string }> = [
  { value: "small", label: "Small bakery", hint: "Hobby / side-income · under ~80 orders/mo" },
  { value: "medium", label: "Medium bakery", hint: "Busy home kitchen · ~80–300 orders/mo" },
  { value: "large", label: "Large bakery", hint: "Team kitchen · 300+ orders/mo" },
];

export const CHANNEL_BUNDLE_OPTIONS: Array<{ value: ChannelBundle; label: string; hint: string }> = [
  { value: "web_only", label: "Web agent only", hint: "Built-in chat on your shared menu" },
  { value: "whatsapp_only", label: "WhatsApp agent only", hint: "Menu + WhatsApp booking / auto-replies" },
  { value: "instagram_only", label: "Instagram agent only", hint: "Menu + Instagram DM agent" },
  { value: "whatsapp_instagram", label: "WhatsApp + Instagram", hint: "Both social agents + web menu" },
];

export const BILLING_PERIOD_OPTIONS: Array<{ value: Exclude<BillingPeriod, "quarterly">; label: string; hint: string }> = [
  { value: "monthly", label: "Pay monthly", hint: "Cancel anytime" },
  { value: "semiannual", label: "Pay every 6 months", hint: "Save ~12% vs monthly" },
  { value: "yearly", label: "Pay yearly", hint: "Save ~20% vs monthly" },
];

/** Billing multipliers — prepaid discounts */
export const BILLING_MULTIPLIERS: Record<"monthly" | "semiannual" | "yearly", { months: number; payMonths: number }> = {
  monthly: { months: 1, payMonths: 1 },
  semiannual: { months: 6, payMonths: 5.28 }, // ~12% off
  yearly: { months: 12, payMonths: 9.6 }, // 20% off
};

export const FOUNDER_OFFER_ACTIVE = true;
export const FOUNDER_OFFER_LABEL = "Founder rate — first 100 bakeries";
export const FOUNDER_OFFER_NOTE =
  "6-month and yearly prepaid lock a lower rate. First month 0% commission on checkout orders. JazzCash / Easypaisa / bank transfer.";

/**
 * Offers matrix: size × channel.
 * Prices include channel cost (WA / IG Meta + agent load).
 */
export const OFFER_PLANS: OfferPlan[] = [
  // ── Small ──────────────────────────────────────────────
  {
    id: "small-web",
    planId: "free",
    size: "small",
    channelBundle: "web_only",
    name: "Launch Free",
    sizeLabel: "Trial",
    tagline: "3-day free trial — web menu + agent, then upgrade.",
    monthlyPkr: 0,
    aiRepliesPerMonth: 50,
    chatsPerMonth: 50,
    whatsappChatsPerMonth: 0,
    instagramChatsPerMonth: 0,
    maxOrdersPerMonth: 20,
    maxProducts: 8,
    staffLogins: 1,
    commissionPercent: 0,
    commissionCapPkr: 0,
    extraReplyPkr: 15,
    serviceIds: ["menu", "web_agent", "orders", "payment", "calendar"],
    chatNote: "50 web agent chats / month",
  },
  {
    id: "small-wa",
    planId: "starter",
    size: "small",
    channelBundle: "whatsapp_only",
    name: "Kitchen Standard · WhatsApp",
    sizeLabel: "Small",
    tagline: "Side-income bakers who book mainly on WhatsApp.",
    monthlyPkr: 1799,
    aiRepliesPerMonth: 250,
    chatsPerMonth: 40,
    whatsappChatsPerMonth: 40,
    instagramChatsPerMonth: 0,
    maxOrdersPerMonth: 80,
    maxProducts: 25,
    staffLogins: 1,
    commissionPercent: 2,
    commissionCapPkr: 450,
    extraReplyPkr: 10,
    featured: true,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "whatsapp", "advance_wa"],
    chatNote: "40 WhatsApp chats / month + web menu",
  },
  {
    id: "small-ig",
    planId: "pro",
    size: "small",
    channelBundle: "instagram_only",
    name: "Kitchen Pro · Instagram",
    sizeLabel: "Small",
    tagline: "Instagram-first bakeries (needs Pro channel unlock).",
    monthlyPkr: 2499,
    aiRepliesPerMonth: 400,
    chatsPerMonth: 80,
    whatsappChatsPerMonth: 0,
    instagramChatsPerMonth: 80,
    maxOrdersPerMonth: 100,
    maxProducts: 40,
    staffLogins: 1,
    commissionPercent: 1.5,
    commissionCapPkr: 600,
    extraReplyPkr: 9,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "instagram", "khata"],
    chatNote: "80 Instagram chats / month + web menu",
  },
  {
    id: "small-both",
    planId: "pro",
    size: "small",
    channelBundle: "whatsapp_instagram",
    name: "Kitchen Pro · Both agents",
    sizeLabel: "Small",
    tagline: "WhatsApp + Instagram for a growing small kitchen.",
    monthlyPkr: 2999,
    aiRepliesPerMonth: 600,
    chatsPerMonth: 180,
    whatsappChatsPerMonth: 100,
    instagramChatsPerMonth: 80,
    maxOrdersPerMonth: 120,
    maxProducts: null,
    staffLogins: 1,
    commissionPercent: 1.5,
    commissionCapPkr: 750,
    extraReplyPkr: 8,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "whatsapp", "instagram", "khata", "advance_wa", "feedback"],
    chatNote: "100 WhatsApp + 80 Instagram chats / month",
  },

  // ── Medium ─────────────────────────────────────────────
  {
    id: "medium-web",
    planId: "starter",
    size: "medium",
    channelBundle: "web_only",
    name: "Kitchen Standard · Web",
    sizeLabel: "Medium",
    tagline: "Busy kitchen using the shared menu + web agent.",
    monthlyPkr: 1999,
    aiRepliesPerMonth: 400,
    chatsPerMonth: 200,
    whatsappChatsPerMonth: 0,
    instagramChatsPerMonth: 0,
    maxOrdersPerMonth: 150,
    maxProducts: 40,
    staffLogins: 1,
    commissionPercent: 2,
    commissionCapPkr: 500,
    extraReplyPkr: 9,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "khata"],
    chatNote: "200 web agent chats / month",
  },
  {
    id: "medium-wa",
    planId: "pro",
    size: "medium",
    channelBundle: "whatsapp_only",
    name: "Kitchen Pro · WhatsApp",
    sizeLabel: "Medium",
    tagline: "Most popular for Pakistan home bakeries — WhatsApp booking.",
    monthlyPkr: 2999,
    aiRepliesPerMonth: 800,
    chatsPerMonth: 150,
    whatsappChatsPerMonth: 150,
    instagramChatsPerMonth: 0,
    maxOrdersPerMonth: 300,
    maxProducts: null,
    staffLogins: 1,
    commissionPercent: 1.5,
    commissionCapPkr: 750,
    extraReplyPkr: 8,
    featured: true,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "khata", "whatsapp", "broadcast", "advance_wa", "feedback"],
    chatNote: "150 WhatsApp chats / month",
  },
  {
    id: "medium-ig",
    planId: "pro",
    size: "medium",
    channelBundle: "instagram_only",
    name: "Kitchen Pro · Instagram",
    sizeLabel: "Medium",
    tagline: "Instagram DM agent for bakeries that sell from IG.",
    monthlyPkr: 2799,
    aiRepliesPerMonth: 700,
    chatsPerMonth: 120,
    whatsappChatsPerMonth: 0,
    instagramChatsPerMonth: 120,
    maxOrdersPerMonth: 250,
    maxProducts: null,
    staffLogins: 1,
    commissionPercent: 1.5,
    commissionCapPkr: 700,
    extraReplyPkr: 8,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "khata", "instagram", "broadcast", "feedback"],
    chatNote: "120 Instagram chats / month",
  },
  {
    id: "medium-both",
    planId: "pro",
    size: "medium",
    channelBundle: "whatsapp_instagram",
    name: "Kitchen Pro · Both agents",
    sizeLabel: "Medium",
    tagline: "WhatsApp + Instagram — full social order desk.",
    monthlyPkr: 3499,
    aiRepliesPerMonth: 1000,
    chatsPerMonth: 230,
    whatsappChatsPerMonth: 150,
    instagramChatsPerMonth: 80,
    maxOrdersPerMonth: 300,
    maxProducts: null,
    staffLogins: 1,
    commissionPercent: 1.5,
    commissionCapPkr: 800,
    extraReplyPkr: 7,
    featured: true,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "khata", "whatsapp", "instagram", "broadcast", "advance_wa", "feedback"],
    chatNote: "150 WhatsApp + 80 Instagram chats / month",
  },

  // ── Large ──────────────────────────────────────────────
  {
    id: "large-web",
    planId: "pro",
    size: "large",
    channelBundle: "web_only",
    name: "Bakery Team · Web",
    sizeLabel: "Large",
    tagline: "High volume on web agent for a busy kitchen.",
    monthlyPkr: 3499,
    aiRepliesPerMonth: 1200,
    chatsPerMonth: 500,
    whatsappChatsPerMonth: 0,
    instagramChatsPerMonth: 0,
    maxOrdersPerMonth: 500,
    maxProducts: null,
    staffLogins: 1,
    commissionPercent: 1,
    commissionCapPkr: 1000,
    extraReplyPkr: 7,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "khata", "broadcast", "support"],
    chatNote: "500 web agent chats / month",
  },
  {
    id: "large-wa",
    planId: "bakery_plus",
    size: "large",
    channelBundle: "whatsapp_only",
    name: "Bakery Team · WhatsApp",
    sizeLabel: "Large",
    tagline: "High WhatsApp volume for a small team kitchen.",
    monthlyPkr: 3999,
    aiRepliesPerMonth: 1500,
    chatsPerMonth: 350,
    whatsappChatsPerMonth: 350,
    instagramChatsPerMonth: 0,
    maxOrdersPerMonth: 600,
    maxProducts: null,
    staffLogins: 2,
    commissionPercent: 1,
    commissionCapPkr: 1100,
    extraReplyPkr: 6,
    featured: true,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "khata", "whatsapp", "broadcast", "advance_wa", "feedback", "support"],
    chatNote: "350 WhatsApp chats / month",
  },
  {
    id: "large-ig",
    planId: "bakery_plus",
    size: "large",
    channelBundle: "instagram_only",
    name: "Bakery Team · Instagram",
    sizeLabel: "Large",
    tagline: "Instagram-heavy bakery with higher DM bundle.",
    monthlyPkr: 3799,
    aiRepliesPerMonth: 1400,
    chatsPerMonth: 250,
    whatsappChatsPerMonth: 0,
    instagramChatsPerMonth: 250,
    maxOrdersPerMonth: 550,
    maxProducts: null,
    staffLogins: 2,
    commissionPercent: 1,
    commissionCapPkr: 1050,
    extraReplyPkr: 6,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "khata", "instagram", "broadcast", "feedback", "support"],
    chatNote: "250 Instagram chats / month",
  },
  {
    id: "large-both",
    planId: "bakery_plus",
    size: "large",
    channelBundle: "whatsapp_instagram",
    name: "Bakery Team · Both agents",
    sizeLabel: "Large",
    tagline: "Maximum chat bundle — WhatsApp + Instagram agents.",
    monthlyPkr: 4499,
    aiRepliesPerMonth: 1800,
    chatsPerMonth: 550,
    whatsappChatsPerMonth: 350,
    instagramChatsPerMonth: 200,
    maxOrdersPerMonth: 600,
    maxProducts: null,
    staffLogins: 2,
    commissionPercent: 1,
    commissionCapPkr: 1200,
    extraReplyPkr: 6,
    featured: true,
    serviceIds: ["menu", "web_agent", "orders", "payment", "crm", "analytics", "calendar", "khata", "whatsapp", "instagram", "broadcast", "advance_wa", "feedback", "support"],
    chatNote: "350 WhatsApp + 200 Instagram chats / month",
  },
];

/** Legacy flat list for settings / badges (one canonical plan per id) */
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Launch Free",
    nameUr: "مفت آغاز",
    tagline: "3-day free trial — publish your menu and test the agent.",
    monthlyPkr: 0,
    founderQuarterlyPkr: 0,
    commissionPercent: 0,
    commissionCapPkr: 0,
    extraReplyPkr: 15,
    aiRepliesPerMonth: 50,
    whatsappConversationsPerMonth: 0,
    maxOrdersPerMonth: 20,
    maxProducts: 8,
    staffLogins: 1,
    limits: {
      products: "Up to 8 menu items",
      aiReplies: "50 agent replies / month",
      orders: "Up to 20 orders / month",
      channels: "Web shop + built-in chat agent only",
      whatsappChats: "WhatsApp & Instagram agents not included",
    },
    features: [
      "Branded menu link & QR code",
      "Basic order inbox",
      "Eggless & delivery area settings",
      "Payment proof review (COD / transfer)",
      "0% commission — you keep full cake price",
    ],
  },
  {
    id: "starter",
    name: "Kitchen Standard",
    nameUr: "کچن سٹینڈرڈ",
    tagline: "Side-income bakers — real order desk + WhatsApp agent.",
    monthlyPkr: 1799,
    founderQuarterlyPkr: 4799,
    commissionPercent: 2,
    commissionCapPkr: 450,
    extraReplyPkr: 10,
    aiRepliesPerMonth: 250,
    whatsappConversationsPerMonth: 40,
    maxOrdersPerMonth: 80,
    maxProducts: 25,
    staffLogins: 1,
    limits: {
      products: "Up to 25 menu items",
      aiReplies: "250 agent replies / month",
      orders: "Up to 80 orders / month",
      channels: "Web agent + WhatsApp agent (limited)",
      whatsappChats: "40 WhatsApp chats / month · Instagram not included",
    },
    features: [
      "Everything in Launch Free",
      "CRM — regulars & at-risk customers",
      "Sales analytics & weekly summary",
      "Urdu / Roman Urdu agent mode",
      "WhatsApp agent (capped chats)",
      "2% checkout commission (invoiced with plan — not auto-deducted; max PKR 450/mo)",
    ],
  },
  {
    id: "pro",
    name: "Kitchen Pro",
    nameUr: "کچن پرو",
    tagline: "Busy home bakeries — WhatsApp / Instagram, Khata, Eid volume.",
    monthlyPkr: 2999,
    founderQuarterlyPkr: 7999,
    featured: true,
    commissionPercent: 1.5,
    commissionCapPkr: 750,
    extraReplyPkr: 8,
    aiRepliesPerMonth: 800,
    whatsappConversationsPerMonth: 150,
    maxOrdersPerMonth: 300,
    maxProducts: null,
    staffLogins: 1,
    limits: {
      products: "Unlimited menu items",
      aiReplies: "800 agent replies / month",
      orders: "Up to 300 orders / month",
      channels: "Web + WhatsApp + Instagram agents",
      whatsappChats: "150 WhatsApp + 80 Instagram chats / month",
    },
    features: [
      "Everything in Kitchen Standard",
      "WhatsApp & Instagram agent setup",
      "Flash drops & customer broadcast",
      "Khata, inventory & recipe margin tracking",
      "Advance payment WhatsApp reminders",
      "1.5% checkout commission (invoiced with plan — not auto-deducted; max PKR 750/mo)",
    ],
  },
  {
    id: "bakery_plus",
    name: "Bakery Team",
    nameUr: "بیکری ٹیم",
    tagline: "Higher chat bundle for a busy team kitchen.",
    monthlyPkr: 4499,
    founderQuarterlyPkr: 11999,
    commissionPercent: 1,
    commissionCapPkr: 1200,
    extraReplyPkr: 6,
    aiRepliesPerMonth: 1500,
    whatsappConversationsPerMonth: 350,
    maxOrdersPerMonth: 600,
    maxProducts: null,
    staffLogins: 2,
    limits: {
      products: "Unlimited menu items",
      aiReplies: "1,500 agent replies / month",
      orders: "Up to 600 orders / month",
      channels: "Web + WhatsApp + Instagram agents",
      whatsappChats: "350 WhatsApp + 200 Instagram chats / month",
    },
    features: [
      "Everything in Kitchen Pro",
      "2 dashboard logins (owner + staff)",
      "Highest WhatsApp + Instagram conversation bundle",
      "Priority support & onboarding call",
      "1% checkout commission (invoiced with plan — not auto-deducted)",
    ],
  },
];

export const MARKET_COMPARISON = {
  competitor: "HomeBakersPK",
  listingOnly:
    "PKR 1,500 / 60 days (~PKR 750/mo) for listings only — no AI agent, no order inbox, no CRM",
  foodpanda: "foodpanda Home Chef: ~PKR 800/mo + high per-order commission",
  sweetToothEdge:
    "Sweet Tooth includes an AI order agent + dashboard — start with a 3-day Launch Free trial, then from PKR 1,799/mo.",
};

export const PRICING_COST_BASIS = [
  "Hosting, database, and auth run 24/7 even when you sleep — unlike a free Instagram page.",
  "Each agent reply may use menu rules, memory, RAG search, or AI fallback — heavy chatters cost real API fees.",
  "WhatsApp / Instagram messages are billed by Meta; chat caps protect your margin and ours.",
  "Listing sites charge PKR 750–1,000/mo for photos only. We charge for agents that answer and take orders.",
];

export function getPlanById(id?: string | null): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.id === id);
}

export function filterOffers(size: BakerSize, channel: ChannelBundle): OfferPlan[] {
  return OFFER_PLANS.filter((o) => o.size === size && o.channelBundle === channel);
}

export function getOffersForFilters(size: BakerSize, channel: ChannelBundle): OfferPlan[] {
  const exact = filterOffers(size, channel);
  if (exact.length > 0) return exact;
  // Fallback: same size, web_only
  return OFFER_PLANS.filter((o) => o.size === size && o.channelBundle === "web_only");
}

export function formatPkr(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
}

export function formatExtraReplyPkr(amount: number): string {
  if (amount === Math.floor(amount)) return formatPkr(amount);
  return `PKR ${amount.toFixed(2)}`;
}

export function priceForBilling(
  monthlyPkr: number,
  period: Exclude<BillingPeriod, "quarterly">,
): { total: number; perMonth: number; months: number; savings: number } {
  if (monthlyPkr === 0) {
    return { total: 0, perMonth: 0, months: 1, savings: 0 };
  }
  const { months, payMonths } = BILLING_MULTIPLIERS[period];
  const total = Math.round(monthlyPkr * payMonths);
  const full = monthlyPkr * months;
  return {
    total,
    perMonth: Math.round(total / months),
    months,
    savings: Math.max(0, full - total),
  };
}

export function displayOfferPrice(
  offer: OfferPlan,
  period: Exclude<BillingPeriod, "quarterly"> = "monthly",
): { primary: string; suffix: string; sub?: string; savings?: string } {
  if (offer.monthlyPkr === 0) {
    return { primary: formatPkr(0), suffix: "forever" };
  }
  const priced = priceForBilling(offer.monthlyPkr, period);
  if (period === "monthly") {
    return { primary: formatPkr(offer.monthlyPkr), suffix: "/ month" };
  }
  return {
    primary: formatPkr(priced.total),
    suffix: period === "semiannual" ? "/ 6 months" : "/ year",
    sub: `≈ ${formatPkr(priced.perMonth)}/month`,
    savings: priced.savings > 0 ? `Save ${formatPkr(priced.savings)} vs monthly` : undefined,
  };
}

export function displayPrice(plan: PricingPlan, period: BillingPeriod = "monthly"): {
  primary: string;
  suffix: string;
  sub?: string;
  savings?: string;
} {
  if (plan.monthlyPkr === 0) {
    return { primary: formatPkr(0), suffix: "forever" };
  }

  if (period === "quarterly" && FOUNDER_OFFER_ACTIVE) {
    const perMonth = Math.round(plan.founderQuarterlyPkr / 3);
    const regularQuarter = plan.monthlyPkr * 3;
    const savings = regularQuarter - plan.founderQuarterlyPkr;
    return {
      primary: formatPkr(plan.founderQuarterlyPkr),
      suffix: "/ 3 months",
      sub: `≈ ${formatPkr(perMonth)}/month locked`,
      savings: savings > 0 ? `Save ${formatPkr(savings)} vs paying monthly` : undefined,
    };
  }

  if (period === "semiannual" || period === "yearly") {
    const priced = priceForBilling(plan.monthlyPkr, period);
    return {
      primary: formatPkr(priced.total),
      suffix: period === "semiannual" ? "/ 6 months" : "/ year",
      sub: `≈ ${formatPkr(priced.perMonth)}/month`,
      savings: priced.savings > 0 ? `Save ${formatPkr(priced.savings)} vs monthly` : undefined,
    };
  }

  return {
    primary: formatPkr(plan.monthlyPkr),
    suffix: "/ month",
  };
}

export function getFounderOfferLines(): string[] {
  return [
    `Kitchen Standard from ${formatPkr(priceForBilling(1799, "semiannual").total)} / 6 months`,
    `Kitchen Pro from ${formatPkr(priceForBilling(2999, "semiannual").total)} / 6 months`,
    `Bakery Team from ${formatPkr(priceForBilling(4499, "yearly").total)} / year`,
  ];
}

export function serviceLabels(ids: AppServiceId[]): string[] {
  return ids.map((id) => APP_SERVICES.find((s) => s.id === id)?.label ?? id);
}

export function estimateMonthlyChats(ordersPerMonth: number): number {
  return Math.ceil(ordersPerMonth * 3 + ordersPerMonth * 0.6);
}

export function suggestPlan(input: {
  ordersPerMonth: number;
  needsWhatsApp?: boolean;
  needsInstagram?: boolean;
  teamSize?: number;
}): { planId: PlanId; estimatedChats: number; reason: string; size: BakerSize; channelBundle: ChannelBundle } {
  const orders = Math.max(0, input.ordersPerMonth);
  const estimatedChats = estimateMonthlyChats(orders);
  const needsWhatsApp = input.needsWhatsApp !== false;
  const needsInstagram = Boolean(input.needsInstagram);
  const teamSize = input.teamSize ?? 1;

  const size: BakerSize = orders > 250 || teamSize >= 2 ? "large" : orders > 80 ? "medium" : "small";
  const channelBundle: ChannelBundle =
    needsWhatsApp && needsInstagram
      ? "whatsapp_instagram"
      : needsInstagram
        ? "instagram_only"
        : needsWhatsApp
          ? "whatsapp_only"
          : "web_only";

  if (size === "large") {
    return {
      planId: "bakery_plus",
      estimatedChats,
      size,
      channelBundle,
      reason: "Large / team volume — Bakery Team with your selected agents.",
    };
  }
  if (channelBundle === "web_only" && orders <= 20) {
    return {
      planId: "free",
      estimatedChats,
      size: "small",
      channelBundle,
      reason: "Low volume, web only — Launch Free is enough to start.",
    };
  }
  if (size === "small" && channelBundle === "whatsapp_only") {
    return {
      planId: "starter",
      estimatedChats,
      size,
      channelBundle,
      reason: "Small bakery on WhatsApp — Kitchen Standard fits.",
    };
  }
  return {
    planId: "pro",
    estimatedChats,
    size,
    channelBundle,
    reason: "Growing bakery — Kitchen Pro with your channel bundle.",
  };
}

export const UNIT_ECONOMICS_NOTE =
  "Offers scale by bakery size and which agents you activate. Prepaid 6-month / yearly rates cover hosting, DB, auth, and Meta chat costs with margin.";
