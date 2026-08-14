import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, chatMessagesTable, conversationMemoryTable, chatHandoffsTable, customersTable } from "@workspace/db";
import { SendChatMessageBody, GetChatHistoryParams } from "@workspace/api-zod";
import { processChatMessage } from "../lib/chat-agent.js";
import { rateLimit } from "../middlewares/rate-limiter.js";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import { z } from "zod";

const router = Router();

// POST /chat
router.post("/chat", rateLimit(60, 60 * 1000), async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { bakerId, message, sessionId } = parsed.data;

  let result;
  try {
    result = await processChatMessage({
      bakerId,
      // A browser visitor has no verified buyer identity. Do not allow a
      // caller to select another customer's saved profile or long-term memory.
      // Verified WhatsApp webhooks resolve the buyer server-side instead.
      buyerId: null,
      message,
      sessionId,
      channel: "web",
    });
  } catch (error) {
    console.error("Chat processing failed", error);
    res.status(500).json({ error: "The bakery assistant is temporarily unavailable. Please try again." });
    return;
  }

  res.json({
    reply: result.reply,
    sessionId: result.sessionId,
    action: result.action,
    cartItemId: result.cartItemId,
    escalated: result.escalated,
  });
});

// Public polling for a browser chat. The random session id acts as a scoped
// capability; only assistant/human replies are returned, never customer data.
router.get("/chat/:bakerId/session/:sessionId", rateLimit(120, 60 * 1000), async (req, res): Promise<void> => {
  const parsed = z.object({
    bakerId: z.coerce.number().int().positive(),
    sessionId: z.string().min(12).max(120),
  }).safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid chat session." });
    return;
  }
  res.setHeader("Cache-Control", "private, no-store");
  const messages = await db
    .select({ id: chatMessagesTable.id, role: chatMessagesTable.role, content: chatMessagesTable.content, createdAt: chatMessagesTable.createdAt })
    .from(chatMessagesTable)
    .where(and(
      eq(chatMessagesTable.bakerId, parsed.data.bakerId),
      eq(chatMessagesTable.sessionId, parsed.data.sessionId),
    ))
    .orderBy(chatMessagesTable.createdAt)
    .limit(100);
  res.json(messages.filter((message) => message.role === "human"));
});

function ownsBakery(req: AuthenticatedRequest, bakerId: number): boolean {
  return Number.isInteger(bakerId) && bakerId > 0 && req.bakerId === bakerId;
}

// Human handoff inbox for owners and support staff.
router.get("/bakers/:bakerId/handoffs", requireBakerAuth, async (req, res): Promise<void> => {
  const bakerId = Number(req.params.bakerId);
  const auth = req as AuthenticatedRequest;
  if (!ownsBakery(auth, bakerId)) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }
  const handoffs = await db.select().from(chatHandoffsTable)
    .where(eq(chatHandoffsTable.bakerId, bakerId))
    .orderBy(desc(chatHandoffsTable.updatedAt));
  const items = await Promise.all(handoffs.map(async (handoff) => {
    const [lastMessage] = await db.select({ content: chatMessagesTable.content, createdAt: chatMessagesTable.createdAt })
      .from(chatMessagesTable)
      .where(and(eq(chatMessagesTable.bakerId, bakerId), eq(chatMessagesTable.sessionId, handoff.sessionId)))
      .orderBy(desc(chatMessagesTable.createdAt)).limit(1);
    const [customer] = handoff.buyerId
      ? await db.select({ id: customersTable.id, name: customersTable.name, whatsappNumber: customersTable.whatsappNumber })
          .from(customersTable).where(and(eq(customersTable.id, handoff.buyerId), eq(customersTable.bakerId, bakerId))).limit(1)
      : [];
    return { ...handoff, lastMessage: lastMessage?.content ?? handoff.reason, customer: customer ?? null };
  }));
  res.json(items);
});

router.get("/bakers/:bakerId/handoffs/:handoffId", requireBakerAuth, async (req, res): Promise<void> => {
  const bakerId = Number(req.params.bakerId);
  const handoffId = Number(req.params.handoffId);
  const auth = req as AuthenticatedRequest;
  if (!ownsBakery(auth, bakerId)) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }
  const [handoff] = await db.select().from(chatHandoffsTable)
    .where(and(eq(chatHandoffsTable.id, handoffId), eq(chatHandoffsTable.bakerId, bakerId))).limit(1);
  if (!handoff) {
    res.status(404).json({ error: "Handoff not found" });
    return;
  }
  const currentMessages = await db.select().from(chatMessagesTable)
    .where(and(eq(chatMessagesTable.bakerId, bakerId), eq(chatMessagesTable.sessionId, handoff.sessionId)))
    .orderBy(chatMessagesTable.createdAt);
  const [customer] = handoff.buyerId
    ? await db.select().from(customersTable).where(and(eq(customersTable.id, handoff.buyerId), eq(customersTable.bakerId, bakerId))).limit(1)
    : [];
  const pastMessages = handoff.buyerId
    ? await db.select().from(chatMessagesTable).where(and(eq(chatMessagesTable.bakerId, bakerId), eq(chatMessagesTable.buyerId, handoff.buyerId))).orderBy(chatMessagesTable.createdAt).limit(300)
    : currentMessages;
  res.json({ handoff, customer: customer ?? null, messages: currentMessages, pastMessages });
});

router.post("/bakers/:bakerId/handoffs/:handoffId/claim", requireBakerAuth, async (req, res): Promise<void> => {
  const bakerId = Number(req.params.bakerId);
  const handoffId = Number(req.params.handoffId);
  const auth = req as AuthenticatedRequest;
  if (!ownsBakery(auth, bakerId)) { res.status(403).json({ error: "Unauthorized" }); return; }
  const [existing] = await db.select().from(chatHandoffsTable).where(and(eq(chatHandoffsTable.id, handoffId), eq(chatHandoffsTable.bakerId, bakerId))).limit(1);
  if (!existing) { res.status(404).json({ error: "Handoff not found" }); return; }
  if (auth.memberRole !== "owner" && existing.assignedMemberId && existing.assignedMemberId !== auth.memberId) {
    res.status(409).json({ error: "This conversation is already assigned to another human agent." });
    return;
  }
  const [updated] = await db.update(chatHandoffsTable).set({
    status: "claimed",
    assignedMemberId: auth.memberId ?? null,
    updatedAt: new Date(),
  }).where(and(eq(chatHandoffsTable.id, handoffId), eq(chatHandoffsTable.bakerId, bakerId))).returning();
  if (!updated) { res.status(404).json({ error: "Handoff not found" }); return; }
  res.json(updated);
});

router.post("/bakers/:bakerId/handoffs/:handoffId/reply", requireBakerAuth, rateLimit(120, 60 * 1000), async (req, res): Promise<void> => {
  const bakerId = Number(req.params.bakerId);
  const handoffId = Number(req.params.handoffId);
  const auth = req as AuthenticatedRequest;
  if (!ownsBakery(auth, bakerId)) { res.status(403).json({ error: "Unauthorized" }); return; }
  const parsed = z.object({ message: z.string().trim().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Reply is required." }); return; }
  const [handoff] = await db.select().from(chatHandoffsTable).where(and(eq(chatHandoffsTable.id, handoffId), eq(chatHandoffsTable.bakerId, bakerId))).limit(1);
  if (!handoff) { res.status(404).json({ error: "Handoff not found" }); return; }
  if (handoff.status === "resolved") { res.status(409).json({ error: "This conversation is resolved. Reopen it from a new customer message." }); return; }
  if (auth.memberRole !== "owner" && handoff.assignedMemberId && handoff.assignedMemberId !== auth.memberId) {
    res.status(409).json({ error: "This conversation is assigned to another human agent." });
    return;
  }
  const [message] = await db.insert(chatMessagesTable).values({
    bakerId,
    buyerId: handoff.buyerId,
    sessionId: handoff.sessionId,
    role: "human",
    content: parsed.data.message,
  }).returning();
  await db.update(chatHandoffsTable).set({ status: "claimed", assignedMemberId: auth.memberId ?? null, customerNotified: true, updatedAt: new Date() })
    .where(eq(chatHandoffsTable.id, handoffId));
  res.status(201).json(message);
});

router.post("/bakers/:bakerId/handoffs/:handoffId/resolve", requireBakerAuth, async (req, res): Promise<void> => {
  const bakerId = Number(req.params.bakerId);
  const handoffId = Number(req.params.handoffId);
  const auth = req as AuthenticatedRequest;
  if (!ownsBakery(auth, bakerId)) { res.status(403).json({ error: "Unauthorized" }); return; }
  const [handoff] = await db.select().from(chatHandoffsTable).where(and(eq(chatHandoffsTable.id, handoffId), eq(chatHandoffsTable.bakerId, bakerId))).limit(1);
  if (!handoff) { res.status(404).json({ error: "Handoff not found" }); return; }
  if (auth.memberRole !== "owner" && handoff.assignedMemberId && handoff.assignedMemberId !== auth.memberId) {
    res.status(409).json({ error: "This conversation is assigned to another human agent." });
    return;
  }
  const [updated] = await db.update(chatHandoffsTable).set({ status: "resolved", resolvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(chatHandoffsTable.id, handoffId), eq(chatHandoffsTable.bakerId, bakerId))).returning();
  if (!updated) { res.status(404).json({ error: "Handoff not found" }); return; }
  res.json(updated);
});

// GET /chat/:bakerId/history/:buyerId
router.get("/chat/:bakerId/history/:buyerId", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = GetChatHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.bakerId, params.data.bakerId),
        eq(chatMessagesTable.buyerId, params.data.buyerId),
      ),
    )
    .orderBy(chatMessagesTable.createdAt);
  res.json(messages);
});

// GET /chat/:bakerId/conversations
router.get("/chat/:bakerId/conversations", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const bakerId = parseInt(String(req.params.bakerId), 10);
  if (isNaN(bakerId)) {
    res.status(400).json({ error: "Invalid bakerId" });
    return;
  }

  const memories = await db
    .select()
    .from(conversationMemoryTable)
    .where(eq(conversationMemoryTable.bakerId, bakerId))
    .orderBy(desc(conversationMemoryTable.lastActiveAt));

  const recentAnon = await db
    .selectDistinctOn([chatMessagesTable.sessionId], {
      sessionId: chatMessagesTable.sessionId,
      bakerId: chatMessagesTable.bakerId,
      buyerId: chatMessagesTable.buyerId,
      lastMessage: chatMessagesTable.content,
      lastActiveAt: chatMessagesTable.createdAt,
    })
    .from(chatMessagesTable)
    .where(
      and(eq(chatMessagesTable.bakerId, bakerId), eq(chatMessagesTable.role, "user")),
    )
    .orderBy(chatMessagesTable.sessionId, desc(chatMessagesTable.createdAt));

  const conversations = memories.map((m) => ({
    buyerId: m.buyerId,
    buyerName: m.buyerName ?? `Buyer #${m.buyerId}`,
    lastMessage: m.summary ?? "No messages yet",
    lastActiveAt: m.lastActiveAt.toISOString(),
    messageCount: m.messageCount,
    unread: false,
    preferences: m.preferences ?? {},
    summary: m.summary,
    needsBakerReply: m.summary === "Customer needs a baker follow-up.",
  }));

  const knownBuyerIds = new Set(memories.map((m) => m.buyerId));
  for (const msg of recentAnon) {
    if (msg.buyerId && knownBuyerIds.has(msg.buyerId)) continue;
    if (!msg.buyerId) continue;
    conversations.push({
      buyerId: msg.buyerId,
      buyerName: `Buyer #${msg.buyerId}`,
      lastMessage: msg.lastMessage,
      lastActiveAt: msg.lastActiveAt.toISOString(),
      messageCount: 0,
      unread: false,
      preferences: {},
      summary: null,
      needsBakerReply: false,
    });
  }

  res.json(conversations);
});

export default router;
