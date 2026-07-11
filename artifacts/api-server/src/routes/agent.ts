import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bakerKnowledgeTable, chatSessionsTable, ordersTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// ── GET /agent/knowledge ─────────────────────────────────────────────────────
router.get("/agent/knowledge", async (_req, res): Promise<void> => {
  const rows = await db.select().from(bakerKnowledgeTable).limit(1);
  if (rows.length === 0) {
    res.json({
      id: null,
      bakerName: "Zara Ahmed",
      businessName: "Sweet Tooth",
      whatsappNumber: "",
      deliveryArea: "",
      deliveryFee: "",
      minimumOrder: "",
      paymentMethods: "COD, JazzCash, Easypaisa",
      businessHours: "Mon–Sat 10am–9pm",
      customPolicies: "",
      menu: [],
    });
    return;
  }
  res.json(rows[0]);
});

// ── POST /agent/knowledge ────────────────────────────────────────────────────
router.post("/agent/knowledge", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const rows = await db.select().from(bakerKnowledgeTable).limit(1);

  if (rows.length === 0) {
    const [created] = await db.insert(bakerKnowledgeTable).values({
      bakerName: String(body.bakerName ?? "Zara Ahmed"),
      businessName: String(body.businessName ?? "Sweet Tooth"),
      whatsappNumber: body.whatsappNumber ? String(body.whatsappNumber) : null,
      deliveryArea: body.deliveryArea ? String(body.deliveryArea) : null,
      deliveryFee: body.deliveryFee ? String(body.deliveryFee) : null,
      minimumOrder: body.minimumOrder ? String(body.minimumOrder) : null,
      paymentMethods: body.paymentMethods ? String(body.paymentMethods) : null,
      businessHours: body.businessHours ? String(body.businessHours) : null,
      customPolicies: body.customPolicies ? String(body.customPolicies) : null,
      menu: (body.menu as object[]) ?? [],
    }).returning();
    res.status(201).json(created);
  } else {
    const [updated] = await db
      .update(bakerKnowledgeTable)
      .set({
        bakerName: String(body.bakerName ?? rows[0].bakerName),
        businessName: String(body.businessName ?? rows[0].businessName),
        whatsappNumber: body.whatsappNumber ? String(body.whatsappNumber) : rows[0].whatsappNumber,
        deliveryArea: body.deliveryArea ? String(body.deliveryArea) : rows[0].deliveryArea,
        deliveryFee: body.deliveryFee ? String(body.deliveryFee) : rows[0].deliveryFee,
        minimumOrder: body.minimumOrder ? String(body.minimumOrder) : rows[0].minimumOrder,
        paymentMethods: body.paymentMethods ? String(body.paymentMethods) : rows[0].paymentMethods,
        businessHours: body.businessHours ? String(body.businessHours) : rows[0].businessHours,
        customPolicies: body.customPolicies ? String(body.customPolicies) : rows[0].customPolicies,
        menu: (body.menu as object[]) ?? rows[0].menu,
      })
      .where(eq(bakerKnowledgeTable.id, rows[0].id))
      .returning();
    res.json(updated);
  }
});

// ── POST /agent/chat ─────────────────────────────────────────────────────────
// Stateful SSE streaming: history is loaded from DB, not trusted from frontend
router.post("/agent/chat", async (req, res): Promise<void> => {
  const { sessionId, message } = req.body as {
    sessionId: string;
    message: string;
  };

  if (!sessionId || !message) {
    res.status(400).json({ error: "sessionId and message required" });
    return;
  }

  // Load conversation history from DB (memory-based, not stateless)
  const sessionRows = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.sessionId, sessionId)).limit(1);
  const dbHistory = (sessionRows[0]?.messages ?? []) as Array<{ role: "user" | "assistant"; content: string }>;

  // Load baker knowledge
  const knowledgeRows = await db.select().from(bakerKnowledgeTable).limit(1);
  const knowledge = knowledgeRows[0];

  // Build menu text — only include AVAILABLE items
  type MenuItem = { name: string; price: string; unit?: string; description?: string; eggless?: boolean; available?: boolean };
  const allMenu = Array.isArray(knowledge?.menu) ? (knowledge.menu as MenuItem[]) : [];
  const availableMenu = allMenu.filter(item => item.available !== false);

  const menuText =
    availableMenu.length > 0
      ? availableMenu
          .map(item => {
            const unit = item.unit || "per piece";
            const egglessNote = item.eggless ? " ✓ eggless available" : "";
            const desc = item.description ? ` — ${item.description}` : "";
            return `• ${item.name}: PKR ${item.price} ${unit}${egglessNote}${desc}`;
          })
          .join("\n")
      : "Menu not configured yet. Please ask the baker for details.";

  const unavailableItems = allMenu.filter(item => item.available === false).map(i => i.name);

  const systemPrompt = `You are the AI order-taking assistant for ${knowledge?.businessName ?? "Sweet Tooth"}, run by ${knowledge?.bakerName ?? "Zara"}.

You answer ONLY based on the information provided below. Never invent items, prices, or flavors not listed.

AVAILABLE MENU (only offer these):
${menuText}

${unavailableItems.length > 0 ? `CURRENTLY UNAVAILABLE (do NOT offer or take orders for these): ${unavailableItems.join(", ")}` : ""}

DELIVERY:
- Area: ${knowledge?.deliveryArea || "Contact baker for details"}
- Fee: ${knowledge?.deliveryFee || "Contact baker"}
- Minimum order: ${knowledge?.minimumOrder || "No minimum"}

PAYMENT: ${knowledge?.paymentMethods || "COD"}
HOURS: ${knowledge?.businessHours || "Contact baker"}
${knowledge?.customPolicies ? `\nPOLICIES:\n${knowledge.customPolicies}` : ""}

ORDERING:
When a customer wants to place an order, collect:
1. Their name
2. What they want (item + quantity — use the item's unit, e.g. "2 dozen cupcakes", "1 chocolate cake per kg")
3. Delivery date and time
4. Delivery address OR confirm pickup
5. Any special requests (flavors, design, allergies)
6. Phone number

Once you have all details confirmed, output EXACTLY this on its own line:
ORDER_JSON:{"customerName":"...","cakeType":"...","weight":"...","deliveryDate":"YYYY-MM-DD","deliveryTime":"...","deliveryType":"delivery or pickup","specialRequests":"...","customerPhone":"...","price":0,"source":"agent"}

Set price=0; the baker confirms the final price. Use "cakeType" for the full item description (e.g. "Chocolate Cupcakes x24").

Keep tone warm and friendly. Use Urdu naturally (Ji, Shukriya, Zaroor). Respond concisely.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...dbHistory.slice(-12), // last 12 turns from DB
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

    // Check for order in response
    const orderMatch = fullResponse.match(/ORDER_JSON:(\{.+\})/);
    let createdOrder: object | null = null;

    if (orderMatch) {
      try {
        const orderData = JSON.parse(orderMatch[1]);
        const [newOrder] = await db
          .insert(ordersTable)
          .values({
            customerName: orderData.customerName ?? "Unknown",
            customerPhone: orderData.customerPhone ?? null,
            cakeType: orderData.cakeType ?? "Custom Order",
            weight: orderData.weight ?? null,
            deliveryDate: orderData.deliveryDate ?? null,
            deliveryTime: orderData.deliveryTime ?? null,
            deliveryType: orderData.deliveryType ?? "delivery",
            price: orderData.price ?? 0,
            specialRequests: orderData.specialRequests ?? null,
            status: "confirmed",
            paymentStatus: "pending",
            source: "agent",
            confidence: 90,
          })
          .returning();
        createdOrder = newOrder;
      } catch {
        // ignore parse errors
      }
    }

    // Persist updated history to DB (this is the memory)
    const updatedMessages = [
      ...dbHistory,
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: fullResponse },
    ];

    if (sessionRows.length > 0) {
      await db.update(chatSessionsTable)
        .set({
          messages: updatedMessages,
          orderCreated: createdOrder ? String((createdOrder as { id: number }).id) : sessionRows[0].orderCreated,
        })
        .where(eq(chatSessionsTable.sessionId, sessionId));
    } else {
      await db.insert(chatSessionsTable).values({
        sessionId,
        messages: updatedMessages,
        orderCreated: createdOrder ? String((createdOrder as { id: number }).id) : null,
      });
    }

    res.write(`data: ${JSON.stringify({ done: true, order: createdOrder })}\n\n`);
  } catch (err) {
    console.error("Agent chat error:", err);
    res.write(`data: ${JSON.stringify({ error: "Agent unavailable" })}\n\n`);
  }
  res.end();
});

// ── POST /agent/delivery-message ─────────────────────────────────────────────
router.post("/agent/delivery-message", async (req, res): Promise<void> => {
  const { orderId } = req.body as { orderId: number };
  if (!orderId) {
    res.status(400).json({ error: "orderId required" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const knowledgeRows = await db.select().from(bakerKnowledgeTable).limit(1);
  const bakerName = knowledgeRows[0]?.bakerName ?? "Zara";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are ${bakerName}'s bakery assistant. Write warm, friendly WhatsApp messages for Pakistani customers. Mix English and Urdu naturally.`,
        },
        {
          role: "user",
          content: `Write a delivery confirmation WhatsApp message for:
Customer: ${order.customerName}
Item: ${order.cakeType}${order.weight ? ` (${order.weight})` : ""}
${order.deliveryType === "pickup" ? "They picked it up." : "We just delivered to them."}
Baker name: ${bakerName}

Keep it warm, 2-3 sentences, include an emoji or two.`,
        },
      ],
    });

    const msg = response.choices[0]?.message?.content ?? "";
    res.json({ message: msg, order });
  } catch (err) {
    console.error("Delivery message error:", err);
    res.status(500).json({ error: "Failed to generate message" });
  }
});

export default router;
