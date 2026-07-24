/**
 * Conversation channel flow for bakers.
 *
 * Rules:
 * 1. Baker picks a primary channel (web | whatsapp | instagram).
 * 2. WhatsApp / Instagram agents can each be ON or OFF independently.
 * 3. Plan gates which channels are allowed.
 * 4. Shared menu always shows catalogue; order/chat CTAs follow the resolved flow.
 * 5. If preferred channel is not ready, fall back to the next ready channel.
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

/** What each plan unlocks for buyer conversations */
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
  /** Channel buyers are sent to for questions/orders */
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
  /** Short English label for the menu header CTA */
  primaryCtaLabel: string;
  /** Explains why a fallback happened (baker-facing / debug) */
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
    // Prefer another social channel the baker already runs, then web.
    const fallbackOrder: ConversationChannel[] =
      preferred === "web"
        ? ["whatsapp", "instagram", "web"]
        : preferred === "whatsapp"
          ? ["instagram", "web", "whatsapp"]
          : ["whatsapp", "web", "instagram"];
    active = fallbackOrder.find((ch) => ready[ch]) ?? "web";
  }

  const showWebChatEffective = webReady && (active === "web" || preferred === "web");
  const showWhatsAppCtaEffective = whatsappReady && (active === "whatsapp" || Boolean(input.whatsappAgentEnabled));
  const showInstagramCtaEffective =
    instagramReady && (active === "instagram" || Boolean(input.instagramAgentEnabled));

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
    showWebChat: showWebChatEffective,
    showWhatsAppCta: showWhatsAppCtaEffective,
    showInstagramCta: showInstagramCtaEffective,
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
