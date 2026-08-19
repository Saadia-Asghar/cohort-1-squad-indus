import { describe, expect, it } from "vitest";
import { resolveConversationFlow } from "./conversation-flow.js";

describe("conversation flow", () => {
  it("keeps the menu assistant and checkout available without social integrations", () => {
    const flow = resolveConversationFlow({
      preferredChannel: "whatsapp",
      agentActive: true,
      whatsappAgentEnabled: false,
      instagramAgentEnabled: false,
      subscriptionPlan: "free",
    });

    expect(flow.active).toBe("web");
    expect(flow.showWebChat).toBe(true);
    expect(flow.showWhatsAppCta).toBe(false);
    expect(flow.primaryCtaLabel).toBe("Book with assistant");
  });

  it("keeps social channels secondary when they are connected", () => {
    const flow = resolveConversationFlow({
      preferredChannel: "whatsapp",
      agentActive: true,
      whatsappAgentEnabled: true,
      hasWhatsAppNumber: true,
      subscriptionPlan: "starter",
    });

    expect(flow.active).toBe("web");
    expect(flow.showWebChat).toBe(true);
    expect(flow.showWhatsAppCta).toBe(true);
  });
});
