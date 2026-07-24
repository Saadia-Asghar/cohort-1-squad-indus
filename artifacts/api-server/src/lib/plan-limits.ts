import { and, count, eq, gte, sql } from "drizzle-orm";
import {
  chatMessagesTable,
  db,
  ordersTable,
  productsTable,
} from "@workspace/db";
import { entitlementsForPlan, planAllowsChannel, type PlanId } from "./conversation-flow.js";

export type BakerPlanId = PlanId;
export { entitlementsForPlan };

/** Mirrors artifacts/sweet-tooth/src/lib/pricing-plans.ts included quotas. */
export type PlanResourceLimits = {
  aiRepliesPerMonth: number;
  maxOrdersPerMonth: number;
  /** null = unlimited */
  maxProducts: number | null;
  /** Total dashboard logins including owner */
  staffLogins: number;
};

export const PLAN_RESOURCE_LIMITS: Record<PlanId, PlanResourceLimits> = {
  free: { aiRepliesPerMonth: 50, maxOrdersPerMonth: 20, maxProducts: 8, staffLogins: 1 },
  starter: { aiRepliesPerMonth: 250, maxOrdersPerMonth: 80, maxProducts: 25, staffLogins: 1 },
  pro: { aiRepliesPerMonth: 800, maxOrdersPerMonth: 300, maxProducts: null, staffLogins: 1 },
  bakery_plus: { aiRepliesPerMonth: 1500, maxOrdersPerMonth: 600, maxProducts: null, staffLogins: 2 },
};

export function staffLoginsForPlan(planId?: string | null): number {
  return resourceLimitsForPlan(planId).staffLogins;
}

export function resourceLimitsForPlan(planId?: string | null): PlanResourceLimits {
  if (planId && planId in PLAN_RESOURCE_LIMITS) {
    return PLAN_RESOURCE_LIMITS[planId as PlanId];
  }
  return PLAN_RESOURCE_LIMITS.free;
}

export function whatsappCapForPlan(planId?: string | null): number {
  return entitlementsForPlan(planId).whatsappConversationsPerMonth;
}

export function instagramCapForPlan(planId?: string | null): number {
  return entitlementsForPlan(planId).instagramConversationsPerMonth;
}

export function canEnableWhatsAppAgent(planId?: string | null): boolean {
  return planAllowsChannel(planId, "whatsapp");
}

export function canEnableInstagramAgent(planId?: string | null): boolean {
  return planAllowsChannel(planId, "instagram");
}

function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function countWhatsAppSessionsThisMonth(bakerId: number): Promise<number> {
  const [row] = await db
    .select({
      sessions: sql<number>`coalesce(count(distinct ${chatMessagesTable.sessionId}), 0)::int`,
    })
    .from(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.bakerId, bakerId),
        gte(chatMessagesTable.createdAt, monthStart()),
        sql`${chatMessagesTable.sessionId} like 'wa-%'`,
      ),
    );

  return row?.sessions ?? 0;
}

export async function countInstagramSessionsThisMonth(bakerId: number): Promise<number> {
  const [row] = await db
    .select({
      sessions: sql<number>`coalesce(count(distinct ${chatMessagesTable.sessionId}), 0)::int`,
    })
    .from(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.bakerId, bakerId),
        gte(chatMessagesTable.createdAt, monthStart()),
        sql`${chatMessagesTable.sessionId} like 'ig-%'`,
      ),
    );

  return row?.sessions ?? 0;
}

export async function countAgentRepliesThisMonth(bakerId: number): Promise<number> {
  const [row] = await db
    .select({
      replies: sql<number>`coalesce(count(*), 0)::int`,
    })
    .from(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.bakerId, bakerId),
        eq(chatMessagesTable.role, "assistant"),
        gte(chatMessagesTable.createdAt, monthStart()),
      ),
    );
  return row?.replies ?? 0;
}

export async function countOrdersThisMonth(bakerId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`coalesce(count(*), 0)::int` })
    .from(ordersTable)
    .where(and(eq(ordersTable.bakerId, bakerId), gte(ordersTable.createdAt, monthStart())));
  return row?.n ?? 0;
}

export async function countProducts(bakerId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(productsTable)
    .where(eq(productsTable.bakerId, bakerId));
  return Number(row?.n ?? 0);
}

export async function isWhatsAppCapReached(
  bakerId: number,
  subscriptionPlan?: string | null,
): Promise<{ capped: boolean; used: number; limit: number }> {
  const limit = whatsappCapForPlan(subscriptionPlan);
  if (limit <= 0) {
    return { capped: true, used: 0, limit: 0 };
  }
  const used = await countWhatsAppSessionsThisMonth(bakerId);
  return { capped: used >= limit, used, limit };
}

export async function isInstagramCapReached(
  bakerId: number,
  subscriptionPlan?: string | null,
): Promise<{ capped: boolean; used: number; limit: number }> {
  const limit = instagramCapForPlan(subscriptionPlan);
  if (limit <= 0) {
    return { capped: true, used: 0, limit: 0 };
  }
  const used = await countInstagramSessionsThisMonth(bakerId);
  return { capped: used >= limit, used, limit };
}

export async function isAiReplyCapReached(
  bakerId: number,
  subscriptionPlan?: string | null,
): Promise<{ capped: boolean; used: number; limit: number }> {
  const limit = resourceLimitsForPlan(subscriptionPlan).aiRepliesPerMonth;
  const used = await countAgentRepliesThisMonth(bakerId);
  return { capped: used >= limit, used, limit };
}

export async function isOrderCapReached(
  bakerId: number,
  subscriptionPlan?: string | null,
): Promise<{ capped: boolean; used: number; limit: number }> {
  const limit = resourceLimitsForPlan(subscriptionPlan).maxOrdersPerMonth;
  const used = await countOrdersThisMonth(bakerId);
  return { capped: used >= limit, used, limit };
}

export async function isProductCapReached(
  bakerId: number,
  subscriptionPlan?: string | null,
): Promise<{ capped: boolean; used: number; limit: number | null }> {
  const limit = resourceLimitsForPlan(subscriptionPlan).maxProducts;
  const used = await countProducts(bakerId);
  if (limit == null) return { capped: false, used, limit: null };
  return { capped: used >= limit, used, limit };
}

export const AI_REPLY_CAP_BUYER_REPLY =
  "The bakery's chat assistant has reached its monthly reply limit. Please WhatsApp the baker directly, or try again after they upgrade.";
