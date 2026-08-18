import { describe, expect, it } from "vitest";
import {
  extractPendingBilling,
  groupChatSessions,
  inferChatChannel,
  conversationKind,
  sortCustomersByValue,
  sortOrdersNewestFirst,
  sortProductsByDemand,
} from "./admin-baker-monitor.js";

const t = (iso: string) => new Date(iso);

describe("inferChatChannel", () => {
  it("maps WhatsApp, Instagram, and web session prefixes", () => {
    expect(inferChatChannel("wa-92300")).toBe("whatsapp");
    expect(inferChatChannel("ig-page-1")).toBe("instagram");
    expect(inferChatChannel("web-abc")).toBe("web");
    expect(inferChatChannel("session-local")).toBe("web");
  });
});

describe("groupChatSessions", () => {
  it("groups by session, newest conversation first, messages chronological", () => {
    const sessions = groupChatSessions([
      {
        id: 1,
        bakerId: 7,
        buyerId: 2,
        sessionId: "web-a",
        role: "user",
        content: "hi",
        createdAt: t("2026-01-01T10:00:00Z"),
      },
      {
        id: 2,
        bakerId: 7,
        buyerId: 2,
        sessionId: "web-a",
        role: "assistant",
        content: "hello",
        createdAt: t("2026-01-01T10:01:00Z"),
      },
      {
        id: 3,
        bakerId: 7,
        buyerId: 3,
        sessionId: "wa-xyz",
        role: "user",
        content: "cake?",
        createdAt: t("2026-01-02T10:00:00Z"),
      },
    ]);

    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.sessionId).toBe("wa-xyz");
    expect(sessions[0]?.channel).toBe("whatsapp");
    expect(sessions[0]?.preview).toBe("cake?");
    expect(sessions[1]?.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(sessions[1]?.messageCount).toBe(2);
    expect(sessions[1]?.kind).toBe("ai_agent");
    expect(sessions[1]?.handoff).toBeNull();
  });

  it("marks a thread as human agent when bakery staff replied or a handoff exists", () => {
    const sessions = groupChatSessions(
      [
        {
          id: 1,
          bakerId: 7,
          buyerId: 2,
          sessionId: "web-human",
          role: "user",
          content: "custom cake?",
          createdAt: t("2026-01-01T10:00:00Z"),
        },
        {
          id: 2,
          bakerId: 7,
          buyerId: 2,
          sessionId: "web-human",
          role: "assistant",
          content: "I am sending this to a person.",
          createdAt: t("2026-01-01T10:01:00Z"),
        },
        {
          id: 3,
          bakerId: 7,
          buyerId: 2,
          sessionId: "web-human",
          role: "human",
          content: "Yes, we can do a 2kg custom cake.",
          createdAt: t("2026-01-01T10:05:00Z"),
        },
      ],
      [
        {
          id: 9,
          sessionId: "web-human",
          buyerId: 2,
          status: "claimed",
          reason: "Custom order needs a person",
          assignedMemberId: 4,
          updatedAt: t("2026-01-01T10:05:00Z"),
        },
      ],
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.kind).toBe("human_agent");
    expect(sessions[0]?.handoff).toEqual({
      id: 9,
      status: "claimed",
      reason: "Custom order needs a person",
      assignedMemberId: 4,
    });
    expect(sessions[0]?.messages.map((m) => m.role)).toEqual(["user", "assistant", "human"]);
  });

  it("keeps human-inbox handoffs even when chat rows are missing", () => {
    const sessions = groupChatSessions([], [
      {
        id: 3,
        sessionId: "wa-orphan",
        buyerId: 11,
        status: "open",
        reason: "Needs a person",
        assignedMemberId: null,
        updatedAt: t("2026-01-03T08:00:00Z"),
      },
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.kind).toBe("human_agent");
    expect(sessions[0]?.channel).toBe("whatsapp");
    expect(sessions[0]?.preview).toBe("Needs a person");
  });

  it("returns an empty list when there are no chats", () => {
    expect(groupChatSessions([])).toEqual([]);
  });
});

describe("conversationKind", () => {
  it("treats assistant-only chats as AI agent", () => {
    expect(conversationKind(["user", "assistant"], null)).toBe("ai_agent");
  });

  it("treats staff replies and open handoffs as human agent", () => {
    expect(conversationKind(["user", "human"], null)).toBe("human_agent");
    expect(
      conversationKind(["user", "assistant"], {
        id: 1,
        sessionId: "web-a",
        buyerId: 2,
        status: "open",
        reason: "Handoff",
        assignedMemberId: null,
        updatedAt: t("2026-01-01T00:00:00Z"),
      }),
    ).toBe("human_agent");
  });
});

describe("extractPendingBilling", () => {
  it("reads a pending JazzCash upgrade from agentConfig", () => {
    expect(
      extractPendingBilling({
        pendingPlanId: "pro",
        billingRequestedAt: "2026-08-01T12:00:00.000Z",
        billingNote: "JazzCash screenshot sent",
      }),
    ).toEqual({
      pendingPlanId: "pro",
      billingRequestedAt: "2026-08-01T12:00:00.000Z",
      billingNote: "JazzCash screenshot sent",
    });
  });

  it("returns nulls when the baker has not requested a plan", () => {
    expect(extractPendingBilling({})).toEqual({
      pendingPlanId: null,
      billingRequestedAt: null,
      billingNote: null,
    });
  });

  it("ignores an unknown pending plan id", () => {
    expect(extractPendingBilling({ pendingPlanId: "enterprise" }).pendingPlanId).toBeNull();
  });
});

describe("sorted bakery records", () => {
  it("sorts orders newest first", () => {
    const sorted = sortOrdersNewestFirst([
      { id: 1, createdAt: t("2026-01-01T00:00:00Z") },
      { id: 2, createdAt: t("2026-03-01T00:00:00Z") },
      { id: 3, createdAt: t("2026-02-01T00:00:00Z") },
    ]);
    expect(sorted.map((o) => o.id)).toEqual([2, 3, 1]);
  });

  it("sorts customers by spend, then order count", () => {
    const sorted = sortCustomersByValue([
      { id: 1, totalSpentPkr: 1000, totalOrders: 8 },
      { id: 2, totalSpentPkr: 5000, totalOrders: 2 },
      { id: 3, totalSpentPkr: 5000, totalOrders: 4 },
    ]);
    expect(sorted.map((c) => c.id)).toEqual([3, 2, 1]);
  });

  it("sorts products by demand then name", () => {
    const sorted = sortProductsByDemand([
      { id: 1, name: "Brownie", totalOrders: 2 },
      { id: 2, name: "Cake", totalOrders: 9 },
      { id: 3, name: "Cupcake", totalOrders: 9 },
    ]);
    expect(sorted.map((p) => p.id)).toEqual([2, 3, 1]);
  });
});
