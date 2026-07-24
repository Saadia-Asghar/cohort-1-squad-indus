import { logger } from "./logger.js";

export type N8nEvent =
  | "chat.received"
  | "chat.escalated"
  | "order.created"
  | "payment.advance_reminder"
  | "billing.upgrade_requested"
  | "billing.plan_activated";

/** Forward non-secret operational events to an n8n Webhook when configured. */
export async function sendN8nEvent(event: N8nEvent, payload: Record<string, unknown>): Promise<void> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET ? { "X-Indus-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({ event, occurredAt: new Date().toISOString(), payload }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) logger.warn({ event, status: response.status }, "n8n webhook rejected event");
  } catch (error) {
    // Automations must never prevent a buyer from receiving a chat reply.
    logger.warn({ err: error, event }, "Failed to deliver n8n event");
  }
}
