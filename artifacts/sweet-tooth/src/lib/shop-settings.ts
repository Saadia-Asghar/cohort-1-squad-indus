export type PaymentMode = "cod" | "partial_advance" | "full_advance";
export type OccasionPreset = "normal" | "eid_fitr" | "eid_ul_adha" | "custom";

export const PAYMENT_MODE_OPTIONS: Array<{ value: PaymentMode; label: string; hint: string }> = [
  {
    value: "cod",
    label: "Cash on delivery (full payment on delivery)",
    hint: "Customer pays the full amount when the order arrives.",
  },
  {
    value: "partial_advance",
    label: "Partial advance + balance on delivery",
    hint: "Take a deposit on large orders; rest as COD.",
  },
  {
    value: "full_advance",
    label: "Full advance before confirmation",
    hint: "Entire order amount must be paid before you start baking.",
  },
];

export const OCCASION_PRESET_OPTIONS: Array<{ value: OccasionPreset; label: string }> = [
  { value: "normal", label: "Regular menu (no special occasion)" },
  { value: "eid_fitr", label: "Eid ul-Fitr" },
  { value: "eid_ul_adha", label: "Eid ul-Adha" },
  { value: "custom", label: "Custom occasion (Ramadan, wedding season, etc.)" },
];

export function formatLeadTime(days?: number, hours?: number | null): string | null {
  if (hours != null && hours > 0) {
    if (days != null && days > 0) return `Ready in ${days}d ${hours}h`;
    return `Ready in ${hours}h`;
  }
  if (days != null && days > 0) return `Ready in ${days} day${days === 1 ? "" : "s"}`;
  return null;
}

export function buildWhatsAppOrderText(productName: string, businessName?: string): string {
  return [
    `Assalam-o-Alaikum${businessName ? ` — ${businessName}` : ""}!`,
    `I would like to order: ${productName}`,
    "",
    "Please share sizes, price, delivery date, and payment details.",
  ].join("\n");
}
