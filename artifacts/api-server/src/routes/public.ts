import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bakerKnowledgeTable, chatSessionsTable, ordersTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// ── GET /api/public/menu/:userId ─────────────────────────────────────────────
// Returns bakery info + available menu items — no auth required
router.get("/public/menu/:userId", async (req, res): Promise<void> => {
  const { userId } = req.params;
  const rows = await db.select().from(bakerKnowledgeTable).where(eq(bakerKnowledgeTable.userId, userId)).limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Menu not found" });
    return;
  }

  const knowledge = rows[0];
  type MenuItem = { name: string; price: string; unit?: string; description?: string; eggless?: boolean; available?: boolean };
  const allMenu = Array.isArray(knowledge.menu) ? (knowledge.menu as MenuItem[]) : [];
  const availableMenu = allMenu.filter(item => item.available !== false);

  res.json({
    businessName: knowledge.businessName,
    bakerName: knowledge.bakerName,
    whatsappNumber: knowledge.whatsappNumber,
    deliveryArea: knowledge.deliveryArea,
    deliveryFee: knowledge.deliveryFee,
    minimumOrder: knowledge.minimumOrder,
    paymentMethods: knowledge.paymentMethods,
    businessHours: knowledge.businessHours,
    menu: availableMenu,
  });
});

// ── POST /api/public/chat ────────────────────────────────────────────────────
// Customer-facing streaming chat — no auth, uses bakerId to scope knowledge
router.post("/public/chat", async (req, res): Promise<void> => {
  const { bakerId, sessionId, message } = req.body as { bakerId: string; sessionId: string; message: string };

  if (!bakerId || !sessionId || !message) {
    res.status(400).json({ error: "bakerId, sessionId and message required" });
    return;
  }

  // Load this baker's knowledge
  const knowledgeRows = await db.select().from(bakerKnowledgeTable).where(eq(bakerKnowledgeTable.userId, bakerId)).limit(1);
  const knowledge = knowledgeRows[0];
  if (!knowledge) {
    res.status(404).json({ error: "Baker not found" });
    return;
  }

  // Load session history — sessions for public chat use a prefix to avoid collisions
  const publicSessionId = `public_${sessionId}`;
  const sessionRows = await db.select().from(chatSessionsTable)
    .where(eq(chatSessionsTable.sessionId, publicSessionId)).limit(1);
  const dbHistory = (sessionRows[0]?.messages ?? []) as Array<{ role: "user" | "assistant"; content: string }>;

  type MenuItem = { name: string; price: string; unit?: string; description?: string; eggless?: boolean; available?: boolean };
  const allMenu = Array.isArray(knowledge.menu) ? (knowledge.menu as MenuItem[]) : [];
  const availableMenu = allMenu.filter(item => item.available !== false);

  const menuText = availableMenu.length > 0
    ? availableMenu.map(item => {
        const unit = item.unit || "per piece";
        const egglessNote = item.eggless ? " ✓ eggless available" : "";
        const desc = item.description ? ` — ${item.description}` : "";
        return `• ${item.name}: PKR ${item.price} ${unit}${egglessNote}${desc}`;
      }).join("\n")
    : "Menu not configured yet. Please contact the baker directly.";

  const systemPrompt = `You are the AI assistant for ${knowledge.businessName}, run by ${knowledge.bakerName}.

You help customers browse the menu, answer questions, and take orders. Be warm, helpful, and concise.

AVAILABLE MENU:
${menuText}

DELIVERY:
- Area: ${knowledge.deliveryArea || "Ask baker"}
- Fee: ${knowledge.deliveryFee || "Ask baker"}
- Minimum: ${knowledge.minimumOrder || "No minimum"}

PAYMENT: ${knowledge.paymentMethods || "COD"}
HOURS: ${knowledge.businessHours || "Contact baker"}
${knowledge.customPolicies ? `\nPOLICIES:\n${knowledge.customPolicies}` : ""}
WHATSAPP: ${knowledge.whatsappNumber || "Not provided"}

ORDERING:
When a customer wants to place an order, collect:
1. Their name
2. What they want (item + quantity with correct unit)
3. Delivery date and preferred time
4. Delivery address or confirm pickup
5. Special requests (flavor, design, allergies)
6. Phone number

Once you have all details, output EXACTLY this on its own line:
ORDER_JSON:{"customerName":"...","cakeType":"...","weight":"...","deliveryDate":"YYYY-MM-DD","deliveryTime":"...","deliveryType":"delivery or pickup","specialRequests":"...","customerPhone":"...","price":0,"source":"agent"}

Keep responses short and friendly. Use Urdu naturally (Ji, Shukriya, Zaroor).`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...dbHistory.slice(-12),
    { role: "user", content: message },
  ];

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 512,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Create order if detected
    const orderMatch = fullResponse.match(/ORDER_JSON:(\{.+\})/);
    let createdOrder: object | null = null;
    if (orderMatch) {
      try {
        const orderData = JSON.parse(orderMatch[1]);
        const [newOrder] = await db.insert(ordersTable).values({
          userId: bakerId,
          customerName: orderData.customerName ?? "Unknown",
          customerPhone: orderData.customerPhone ?? null,
          cakeType: orderData.cakeType ?? "Custom Order",
          weight: orderData.weight ?? null,
          deliveryDate: orderData.deliveryDate ?? null,
          deliveryTime: orderData.deliveryTime ?? null,
          deliveryType: orderData.deliveryType ?? "delivery",
          price: 0,
          specialRequests: orderData.specialRequests ?? null,
          status: "confirmed",
          paymentStatus: "pending",
          source: "agent",
          confidence: 90,
        }).returning();
        createdOrder = newOrder;
      } catch { /* ignore */ }
    }

    // Persist history
    const updatedMessages = [
      ...dbHistory,
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: fullResponse },
    ];

    if (sessionRows.length > 0) {
      await db.update(chatSessionsTable)
        .set({ messages: updatedMessages, orderCreated: createdOrder ? String((createdOrder as { id: number }).id) : sessionRows[0].orderCreated })
        .where(eq(chatSessionsTable.sessionId, publicSessionId));
    } else {
      await db.insert(chatSessionsTable).values({
        userId: bakerId,
        sessionId: publicSessionId,
        messages: updatedMessages,
        orderCreated: createdOrder ? String((createdOrder as { id: number }).id) : null,
      });
    }

    res.write(`data: ${JSON.stringify({ done: true, order: createdOrder })}\n\n`);
  } catch (err) {
    console.error("Public chat error:", err);
    res.write(`data: ${JSON.stringify({ error: "Agent unavailable" })}\n\n`);
  }
  res.end();
});

export default router;
