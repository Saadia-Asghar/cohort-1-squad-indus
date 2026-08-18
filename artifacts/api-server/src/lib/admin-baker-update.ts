export const ADMIN_PLAN_IDS = ["free", "starter", "pro", "bakery_plus"] as const;
export type AdminPlanId = (typeof ADMIN_PLAN_IDS)[number];

export type BakerAdminPatch = {
  subscriptionPlan?: AdminPlanId;
  agentActive?: boolean;
  marketplaceVisible?: boolean;
  whatsappAgentEnabled?: boolean;
  instagramAgentEnabled?: boolean;
  trialEndsAt?: string | null;
};

export function buildBakerAdminUpdate(patch: BakerAdminPatch): Record<string, unknown> | null {
  const set: Record<string, unknown> = {};
  if (patch.subscriptionPlan) set.subscriptionPlan = patch.subscriptionPlan;
  if (typeof patch.agentActive === "boolean") set.agentActive = patch.agentActive;
  if (typeof patch.marketplaceVisible === "boolean") set.marketplaceVisible = patch.marketplaceVisible;
  if (typeof patch.whatsappAgentEnabled === "boolean") set.whatsappAgentEnabled = patch.whatsappAgentEnabled;
  if (typeof patch.instagramAgentEnabled === "boolean") set.instagramAgentEnabled = patch.instagramAgentEnabled;
  if (patch.trialEndsAt === null) set.trialEndsAt = null;
  else if (typeof patch.trialEndsAt === "string") {
    const date = new Date(patch.trialEndsAt);
    if (Number.isNaN(date.getTime())) return null;
    set.trialEndsAt = date;
  }
  if (patch.subscriptionPlan === "free" && patch.trialEndsAt === undefined) {
    set.trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  }
  if (patch.subscriptionPlan && patch.subscriptionPlan !== "free" && patch.trialEndsAt === undefined) {
    set.trialEndsAt = null;
  }
  return Object.keys(set).length > 0 ? set : null;
}
