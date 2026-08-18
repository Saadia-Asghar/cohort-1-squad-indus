import { ADMIN_PLAN_IDS, type AdminPlanId } from "./admin-baker-update.js";

export type ChatChannel = "whatsapp" | "instagram" | "web";
export type ConversationKind = "ai_agent" | "human_agent";

export type MonitorChatMessage = {
  id: number;
  bakerId: number;
  buyerId: number | null;
  sessionId: string;
  role: string;
  content: string;
  createdAt: Date | string;
};

export type MonitorHandoff = {
  id: number;
  sessionId: string;
  buyerId: number | null;
  status: string;
  reason: string;
  assignedMemberId: number | null;
  updatedAt: Date | string;
};

export type MonitorChatSession = {
  sessionId: string;
  channel: ChatChannel;
  kind: ConversationKind;
  buyerId: number | null;
  lastMessageAt: string;
  messageCount: number;
  preview: string;
  handoff: {
    id: number;
    status: string;
    reason: string;
    assignedMemberId: number | null;
  } | null;
  messages: Array<{
    id: number;
    role: string;
    content: string;
    createdAt: string;
  }>;
};

export type PendingBilling = {
  pendingPlanId: AdminPlanId | null;
  billingRequestedAt: string | null;
  billingNote: string | null;
};

const PAID_PENDING = new Set<string>(["starter", "pro", "bakery_plus"]);

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function toTime(value: Date | string): number {
  return new Date(value).getTime();
}

export function inferChatChannel(sessionId: string): ChatChannel {
  if (sessionId.startsWith("wa-")) return "whatsapp";
  if (sessionId.startsWith("ig-")) return "instagram";
  return "web";
}

export function conversationKind(roles: string[], handoff: MonitorHandoff | null): ConversationKind {
  if (handoff || roles.includes("human")) return "human_agent";
  return "ai_agent";
}

function toHandoffSummary(handoff: MonitorHandoff) {
  return {
    id: handoff.id,
    status: handoff.status,
    reason: handoff.reason,
    assignedMemberId: handoff.assignedMemberId,
  };
}

export function groupChatSessions(
  messages: MonitorChatMessage[],
  handoffs: MonitorHandoff[] = [],
): MonitorChatSession[] {
  const bySession = new Map<string, MonitorChatMessage[]>();
  for (const message of messages) {
    const list = bySession.get(message.sessionId) ?? [];
    list.push(message);
    bySession.set(message.sessionId, list);
  }

  const handoffBySession = new Map<string, MonitorHandoff>();
  for (const handoff of handoffs) {
    const existing = handoffBySession.get(handoff.sessionId);
    if (!existing || toTime(handoff.updatedAt) >= toTime(existing.updatedAt)) {
      handoffBySession.set(handoff.sessionId, handoff);
    }
  }

  const sessions: MonitorChatSession[] = [];
  for (const [sessionId, rows] of bySession) {
    const ordered = [...rows].sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
    const last = ordered[ordered.length - 1];
    if (!last) continue;
    const handoff = handoffBySession.get(sessionId) ?? null;
    sessions.push({
      sessionId,
      channel: inferChatChannel(sessionId),
      kind: conversationKind(
        ordered.map((row) => row.role),
        handoff,
      ),
      buyerId: last.buyerId ?? ordered.find((row) => row.buyerId != null)?.buyerId ?? handoff?.buyerId ?? null,
      lastMessageAt: toIso(last.createdAt),
      messageCount: ordered.length,
      preview: last.content.slice(0, 160),
      handoff: handoff ? toHandoffSummary(handoff) : null,
      messages: ordered.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        createdAt: toIso(row.createdAt),
      })),
    });
  }

  for (const [sessionId, handoff] of handoffBySession) {
    if (bySession.has(sessionId)) continue;
    sessions.push({
      sessionId,
      channel: inferChatChannel(sessionId),
      kind: "human_agent",
      buyerId: handoff.buyerId,
      lastMessageAt: toIso(handoff.updatedAt),
      messageCount: 0,
      preview: handoff.reason.slice(0, 160),
      handoff: toHandoffSummary(handoff),
      messages: [],
    });
  }

  return sessions.sort((a, b) => toTime(b.lastMessageAt) - toTime(a.lastMessageAt));
}

export function extractPendingBilling(agentConfig: unknown): PendingBilling {
  const conf = (agentConfig ?? {}) as Record<string, unknown>;
  const rawPlan = typeof conf.pendingPlanId === "string" ? conf.pendingPlanId : null;
  const pendingPlanId =
    rawPlan && PAID_PENDING.has(rawPlan) && ADMIN_PLAN_IDS.includes(rawPlan as AdminPlanId)
      ? (rawPlan as AdminPlanId)
      : null;
  return {
    pendingPlanId,
    billingRequestedAt: typeof conf.billingRequestedAt === "string" ? conf.billingRequestedAt : null,
    billingNote: typeof conf.billingNote === "string" ? conf.billingNote : null,
  };
}

export function sortOrdersNewestFirst<T extends { id: number; createdAt: Date | string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt) || b.id - a.id);
}

export function sortCustomersByValue<T extends { id: number; totalSpentPkr: number; totalOrders: number }>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) => b.totalSpentPkr - a.totalSpentPkr || b.totalOrders - a.totalOrders || b.id - a.id,
  );
}

export function sortProductsByDemand<T extends { id: number; name: string; totalOrders: number }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => b.totalOrders - a.totalOrders || a.name.localeCompare(b.name) || b.id - a.id,
  );
}
