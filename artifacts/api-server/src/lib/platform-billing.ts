/**
 * Platform billing: bakers WhatsApp Sweet Tooth for plan payment details.
 * No JazzCash / bank account is published in the app.
 */

export type PaidPlanId = "starter" | "pro" | "bakery_plus";

export const PAID_PLAN_IDS: PaidPlanId[] = ["starter", "pro", "bakery_plus"];

/** Founder WhatsApp until admin saves a different number in the portal. */
export const DEFAULT_PLATFORM_WHATSAPP = "03159127771";

export function isPaidPlanId(value: string): value is PaidPlanId {
  return (PAID_PLAN_IDS as string[]).includes(value);
}

export type PlatformBillingConfig = {
  enabled: boolean;
  ownerName: string;
  whatsappNumber: string | null;
  whatsappDisplay: string | null;
  whatsappChatUrl: string | null;
  paymentDetails: string;
  instructions: string;
};

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Normalize to wa.me international form (92…). */
export function platformWhatsAppDigits(raw?: string | null): string | null {
  const digits = digitsOnly(raw ?? process.env.PLATFORM_WHATSAPP ?? DEFAULT_PLATFORM_WHATSAPP);
  if (digits.length < 10) return null;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  if (digits.startsWith("92")) return digits;
  return digits;
}

export function formatPakistanWhatsAppDisplay(digits92: string | null): string | null {
  if (!digits92) return null;
  if (digits92.startsWith("92") && digits92.length === 12) {
    return `0${digits92.slice(2, 5)}-${digits92.slice(5)}`;
  }
  return digits92;
}

export function whatsappPaymentCopy(ownerName: string, displayPhone: string): string {
  return `WhatsApp ${displayPhone} (${ownerName}) for plan payment details. We share how to pay on WhatsApp — no account numbers in the app.`;
}

export function getPlatformBillingConfig(): PlatformBillingConfig {
  const whatsappNumber = platformWhatsAppDigits();
  const ownerName = (process.env.PLATFORM_BILLING_NAME ?? "Sweet Tooth").trim() || "Sweet Tooth";
  const whatsappDisplay = formatPakistanWhatsAppDisplay(whatsappNumber);
  const paymentDetails = whatsappDisplay
    ? whatsappPaymentCopy(ownerName, whatsappDisplay)
    : "WhatsApp us for plan payment details.";

  return {
    enabled: Boolean(whatsappNumber),
    ownerName,
    whatsappNumber,
    whatsappDisplay,
    whatsappChatUrl: whatsappNumber ? `https://wa.me/${whatsappNumber}` : null,
    paymentDetails,
    instructions:
      "1) WhatsApp us your bakery name and chosen plan. 2) We will share payment details on WhatsApp. 3) Send the receipt there — we activate your plan. No card needed.",
  };
}

export function buildUpgradeWhatsAppUrl(input: {
  planId: PaidPlanId;
  planName: string;
  amountLabel: string;
  bakerId: number;
  businessName: string;
  ownerName?: string | null;
}): string | null {
  const digits = platformWhatsAppDigits();
  if (!digits) return null;
  const text = [
    `Assalam-o-Alaikum ${input.ownerName ?? "Sweet Tooth"}!`,
    `I want to upgrade my bakery on Sweet Tooth.`,
    `Bakery: ${input.businessName} (id ${input.bakerId})`,
    `Plan: ${input.planName} (${input.planId})`,
    `Amount: ${input.amountLabel}`,
    `Please share payment details on WhatsApp.`,
  ].join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type BillingAgentConfig = {
  pendingPlanId?: string;
  billingRequestedAt?: string;
  billingNote?: string;
};

export function readBillingState(agentConfig: unknown): BillingAgentConfig {
  const conf = (agentConfig ?? {}) as BillingAgentConfig;
  return {
    pendingPlanId: conf.pendingPlanId,
    billingRequestedAt: conf.billingRequestedAt,
    billingNote: conf.billingNote,
  };
}
