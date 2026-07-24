/**
 * Server-side mirror of conversation channel resolution.
 * Keep in sync with artifacts/sweet-tooth/src/lib/conversation-flow.ts
 */

export type ConversationChannel = "web" | "whatsapp" | "instagram";
export type PlanId = "free" | "starter" | "pro" | "bakery_plus";

export type ChannelEntitlements = {
  web: boolean;
  whatsapp: boolean;
  instagram: boolean;
  whatsappConversationsPerMonth: number;
  instagramConversationsPerMonth: number;
};

export const PLAN_CHANNEL_ENTITLEMENTS: Record<PlanId, ChannelEntitlements> = {
  free: {
    web: true,
    whatsapp: false,
    instagram: false,
    whatsappConversationsPerMonth: 0,
    instagramConversationsPerMonth: 0,
  },
  starter: {
    web: true,
    whatsapp: true,
    instagram: false,
    whatsappConversationsPerMonth: 40,
    instagramConversationsPerMonth: 0,
  },
  pro: {
    web: true,
    whatsapp: true,
    instagram: true,
    whatsappConversationsPerMonth: 150,
    instagramConversationsPerMonth: 80,
  },
  bakery_plus: {
    web: true,
    whatsapp: true,
    instagram: true,
    whatsappConversationsPerMonth: 350,
    instagramConversationsPerMonth: 200,
  },
};

export function entitlementsForPlan(planId?: string | null): ChannelEntitlements {
  if (planId && planId in PLAN_CHANNEL_ENTITLEMENTS) {
    return PLAN_CHANNEL_ENTITLEMENTS[planId as PlanId];
  }
  return PLAN_CHANNEL_ENTITLEMENTS.free;
}

export type ChannelReadinessInput = {
  preferredChannel?: ConversationChannel | string | null;
  agentActive?: boolean | null;
  whatsappAgentEnabled?: boolean | null;
  instagramAgentEnabled?: boolean | null;
  hasWhatsAppNumber?: boolean;
  hasInstagramUrl?: boolean;
  subscriptionPlan?: string | null;
};

export type ResolvedConversationFlow = {
  preferred: ConversationChannel;
  active: ConversationChannel;
  fallbackUsed: boolean;
  showWebChat: boolean;
  showWhatsAppCta: boolean;
  showInstagramCta: boolean;
  whatsappReady: boolean;
  instagramReady: boolean;
  webReady: boolean;
  planAllowsWhatsApp: boolean;
  planAllowsInstagram: boolean;
  entitlements: ChannelEntitlements;
  primaryCtaLabel: string;
  statusNote: string;
};

function normalizePreferred(value: unknown): ConversationChannel {
  if (value === "whatsapp" || value === "instagram" || value === "web") return value;
  return "web";
}

export function resolveConversationFlow(input: ChannelReadinessInput): ResolvedConversationFlow {
  const preferred = normalizePreferred(input.preferredChannel);
  const entitlements = entitlementsForPlan(input.subscriptionPlan);
  const agentOn = input.agentActive !== false;

  const planAllowsWhatsApp = entitlements.whatsapp;
  const planAllowsInstagram = entitlements.instagram;

  const webReady = agentOn && entitlements.web;
  const whatsappReady =
    agentOn &&
    planAllowsWhatsApp &&
    Boolean(input.whatsappAgentEnabled) &&
    Boolean(input.hasWhatsAppNumber);
  const instagramReady =
    agentOn &&
    planAllowsInstagram &&
    Boolean(input.instagramAgentEnabled) &&
    Boolean(input.hasInstagramUrl);

  const ready: Record<ConversationChannel, boolean> = {
    web: webReady,
    whatsapp: whatsappReady,
    instagram: instagramReady,
  };

  let active: ConversationChannel = preferred;
  let fallbackUsed = false;
  if (!ready[preferred]) {
    fallbackUsed = true;
    const fallbackOrder: ConversationChannel[] =
      preferred === "web"
        ? ["whatsapp", "instagram", "web"]
        : preferred === "whatsapp"
          ? ["instagram", "web", "whatsapp"]
          : ["whatsapp", "web", "instagram"];
    active = fallbackOrder.find((ch) => ready[ch]) ?? "web";
  }

  const showWebChat = webReady && (active === "web" || preferred === "web");
  const showWhatsAppCta = whatsappReady && (active === "whatsapp" || Boolean(input.whatsappAgentEnabled));
  const showInstagramCta = instagramReady && (active === "instagram" || Boolean(input.instagramAgentEnabled));

  const primaryCtaLabel =
    active === "whatsapp"
      ? "Order on WhatsApp"
      : active === "instagram"
        ? "Message on Instagram"
        : "Chat with assistant";

  let statusNote = `Primary channel: ${preferred}. Buyers are routed to ${active}.`;
  if (fallbackUsed) {
    if (preferred === "whatsapp" && !planAllowsWhatsApp) {
      statusNote = "WhatsApp agent needs Kitchen Standard or higher — buyers use the web assistant for now.";
    } else if (preferred === "instagram" && !planAllowsInstagram) {
      statusNote = "Instagram agent needs Kitchen Pro or higher — buyers use the next ready channel.";
    } else if (preferred === "whatsapp" && !input.whatsappAgentEnabled) {
      statusNote = "WhatsApp agent is off — turn it on in Agent Hub, or buyers stay on web chat.";
    } else if (preferred === "instagram" && !input.instagramAgentEnabled) {
      statusNote = "Instagram agent is off — turn it on in Agent Hub, or buyers stay on another channel.";
    } else {
      statusNote = `Preferred channel (${preferred}) is not ready — buyers fall back to ${active}.`;
    }
  }

  return {
    preferred,
    active,
    fallbackUsed,
    showWebChat,
    showWhatsAppCta,
    showInstagramCta,
    whatsappReady,
    instagramReady,
    webReady,
    planAllowsWhatsApp,
    planAllowsInstagram,
    entitlements,
    primaryCtaLabel,
    statusNote,
  };
}

export function planAllowsChannel(planId: string | null | undefined, channel: ConversationChannel): boolean {
  const e = entitlementsForPlan(planId);
  return e[channel];
}
