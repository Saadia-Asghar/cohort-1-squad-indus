import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, chatMessagesTable, conversationMemoryTable } from "@workspace/db";
import { SendChatMessageBody, GetChatHistoryParams } from "@workspace/api-zod";
import { processChatMessage } from "../lib/chat-agent.js";
import { rateLimit } from "../middlewares/rate-limiter.js";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";

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
    });
  }

  res.json(conversations);
});

export default router;
