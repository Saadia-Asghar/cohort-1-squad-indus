/**
 * Free platform billing: bakers pay you manually (JazzCash / Easypaisa / bank)
 * then confirm on WhatsApp. No payment gateway required.
 */

export type PaidPlanId = "starter" | "pro" | "bakery_plus";

export const PAID_PLAN_IDS: PaidPlanId[] = ["starter", "pro", "bakery_plus"];

export function isPaidPlanId(value: string): value is PaidPlanId {
  return (PAID_PLAN_IDS as string[]).includes(value);
}

export type PlatformBillingConfig = {
  enabled: boolean;
  ownerName: string;
  whatsappNumber: string | null;
  whatsappChatUrl: string | null;
  paymentDetails: string;
  instructions: string;
};

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Normalize to wa.me international form (92…). */
export function platformWhatsAppDigits(raw?: string | null): string | null {
  const digits = digitsOnly(raw ?? process.env.PLATFORM_WHATSAPP ?? "");
  if (digits.length < 10) return null;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  if (digits.startsWith("92")) return digits;
  return digits;
}

export function getPlatformBillingConfig(): PlatformBillingConfig {
  const whatsappNumber = platformWhatsAppDigits();
  const ownerName = (process.env.PLATFORM_BILLING_NAME ?? "Sweet Tooth").trim() || "Sweet Tooth";
  const paymentDetails = (
    process.env.PLATFORM_PAYMENT_DETAILS ??
    "Pay via JazzCash / Easypaisa / bank transfer, then WhatsApp us your bakery name + plan + receipt."
  ).trim();

  return {
    enabled: Boolean(whatsappNumber),
    ownerName,
    whatsappNumber,
    whatsappChatUrl: whatsappNumber ? `https://wa.me/${whatsappNumber}` : null,
    paymentDetails,
    instructions:
      "1) Transfer the plan amount using the details below. 2) WhatsApp us your bakery name, chosen plan, and payment screenshot. 3) We activate your plan — no app fees or card needed.",
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
    `I will send the JazzCash/Easypaisa/bank receipt next.`,
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
