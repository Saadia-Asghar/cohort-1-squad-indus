export type PaymentMode = "cod" | "partial_advance" | "full_advance";
export type OccasionPreset = "normal" | "eid_fitr" | "eid_ul_adha" | "custom";

export type OccasionSettings = {
  occasionPreset?: OccasionPreset;
  occasionCustomLabel?: string;
  occasionOrderDeadline?: string;
  occasionFreshDays?: number;
  occasionNote?: string;
};

const OCCASION_LABELS: Record<Exclude<OccasionPreset, "normal" | "custom">, string> = {
  eid_fitr: "Eid ul-Fitr",
  eid_ul_adha: "Eid ul-Adha",
};

export function normalizePaymentMode(
  mode: unknown,
  requireAdvance?: boolean,
  advancePercentage?: number,
): PaymentMode {
  if (mode === "cod" || mode === "partial_advance" || mode === "full_advance") {
    return mode;
  }
  if (requireAdvance && (advancePercentage ?? 0) >= 100) return "full_advance";
  if (requireAdvance) return "partial_advance";
  return "cod";
}

export function paymentFieldsForMode(mode: PaymentMode): {
  requireAdvance: boolean;
  advancePercentage: number;
  advanceThresholdPkr?: number;
} {
  if (mode === "full_advance") {
    return { requireAdvance: true, advancePercentage: 100, advanceThresholdPkr: 0 };
  }
  if (mode === "partial_advance") {
    return { requireAdvance: true, advancePercentage: 50 };
  }
  return { requireAdvance: false, advancePercentage: 0 };
}

export function buildPaymentPolicySummary(input: {
  mode: PaymentMode;
  advancePercentage?: number;
  advanceThresholdPkr?: number;
  codPolicy?: string | null;
}): string {
  const { mode, advancePercentage = 50, advanceThresholdPkr = 2000, codPolicy } = input;
  if (mode === "cod") {
    return codPolicy?.trim() || "Cash on delivery (COD) — pay in full when you receive your order.";
  }
  if (mode === "full_advance") {
    return "Full advance required before your order is confirmed. The bakery will share account details after you order.";
  }
  return `Advance ${advancePercentage}% required on orders from PKR ${advanceThresholdPkr.toLocaleString("en-PK")}. Remaining balance on delivery.`;
}

export function resolveOccasionLabel(config: OccasionSettings): string | null {
  const preset = config.occasionPreset ?? "normal";
  if (preset === "normal") return null;
  if (preset === "custom") return config.occasionCustomLabel?.trim() || "Special occasion";
  return OCCASION_LABELS[preset];
}

export function buildOccasionBanner(config: OccasionSettings): string | null {
  const label = resolveOccasionLabel(config);
  if (!label) return null;
  const parts: string[] = [`${label} orders open`];
  if (config.occasionFreshDays != null && config.occasionFreshDays > 0) {
    parts.push(`baked fresh within ${config.occasionFreshDays} day${config.occasionFreshDays === 1 ? "" : "s"} of your date`);
  }
  if (config.occasionOrderDeadline) {
    parts.push(`order by ${config.occasionOrderDeadline}`);
  }
  if (config.occasionNote?.trim()) {
    parts.push(config.occasionNote.trim());
  }
  return parts.join(" · ");
}

export function extractShopConfig(agentConfig: Record<string, unknown> | null | undefined) {
  const conf = agentConfig ?? {};
  return {
    paymentMode: normalizePaymentMode(conf.paymentMode),
    occasionPreset: (conf.occasionPreset as OccasionPreset | undefined) ?? "normal",
    occasionCustomLabel: (conf.occasionCustomLabel as string | undefined) ?? "",
    occasionOrderDeadline: (conf.occasionOrderDeadline as string | undefined) ?? "",
    occasionFreshDays: typeof conf.occasionFreshDays === "number" ? conf.occasionFreshDays : undefined,
    occasionNote: (conf.occasionNote as string | undefined) ?? "",
  };
}

export function buildWhatsAppMenuUrl(businessName: string, phoneDigits: string, context?: string): string | null {
  const digits = phoneDigits.replace(/\D/g, "");
  if (!digits) return null;
  const international = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  const text = context?.trim() ||
    `Assalam-o-Alaikum! I opened ${businessName}'s menu on Sweet Tooth and would like to place an order.`;
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}
