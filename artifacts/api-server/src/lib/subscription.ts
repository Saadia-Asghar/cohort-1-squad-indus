/** Launch Free is a 3-day trial. Paid plans stay open after manual WhatsApp billing activation. */

export const FREE_TRIAL_DAYS = 3;

export type TrialBaker = {
  subscriptionPlan: string | null | undefined;
  trialEndsAt?: Date | string | null;
  createdAt: Date | string;
};

export function freeTrialEndsAtFrom(createdAt: Date | string, from = new Date()): Date {
  const start = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const end = new Date(Number.isNaN(start.getTime()) ? from.getTime() : start.getTime());
  end.setDate(end.getDate() + FREE_TRIAL_DAYS);
  return end;
}

export function resolveTrialEndsAt(baker: TrialBaker): Date | null {
  if ((baker.subscriptionPlan ?? "free") !== "free") return null;
  if (baker.trialEndsAt) {
    const parsed = typeof baker.trialEndsAt === "string" ? new Date(baker.trialEndsAt) : baker.trialEndsAt;
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return freeTrialEndsAtFrom(baker.createdAt);
}

/** Paid plans: always active after WhatsApp billing activation. Free: active only until trial end. */
export function isPlanAccessActive(baker: TrialBaker, now = new Date()): boolean {
  if ((baker.subscriptionPlan ?? "free") !== "free") return true;
  const ends = resolveTrialEndsAt(baker);
  return Boolean(ends && ends.getTime() > now.getTime());
}

export function trialStatus(baker: TrialBaker, now = new Date()): {
  isFree: boolean;
  active: boolean;
  trialEndsAt: string | null;
  daysLeft: number | null;
  expired: boolean;
} {
  const isFree = (baker.subscriptionPlan ?? "free") === "free";
  if (!isFree) {
    return { isFree: false, active: true, trialEndsAt: null, daysLeft: null, expired: false };
  }
  const ends = resolveTrialEndsAt(baker);
  const active = Boolean(ends && ends.getTime() > now.getTime());
  const msLeft = ends ? ends.getTime() - now.getTime() : 0;
  const daysLeft = active ? Math.max(0, Math.ceil(msLeft / 86_400_000)) : 0;
  return {
    isFree: true,
    active,
    trialEndsAt: ends?.toISOString() ?? null,
    daysLeft,
    expired: !active,
  };
}

export const TRIAL_EXPIRED_BUYER_REPLY =
  "This bakery's free Sweet Tooth trial has ended. Please message the baker directly on WhatsApp or Instagram to order.";
