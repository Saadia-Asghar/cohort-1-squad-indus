export const WAITLIST_SOURCES = ["launch", "whatsapp"] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

export function normalizeWaitlistSource(value: unknown): WaitlistSource {
  return value === "launch" ? "launch" : "whatsapp";
}

export function waitlistDisplayLabel(source: string | null | undefined): string {
  return source === "launch" ? "Launch waitlist" : "WhatsApp agent";
}
