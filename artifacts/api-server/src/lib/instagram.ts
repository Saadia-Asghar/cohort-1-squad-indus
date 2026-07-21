import { logger } from "./logger.js";

const GRAPH_API = "https://graph.instagram.com/v25.0";

export type InstagramInboundMessage = {
  accountId: string;
  senderId: string;
  messageId: string;
  text: string;
};

export function parseInstagramWebhook(body: unknown): InstagramInboundMessage[] {
  const payload = body as {
    object?: string;
    entry?: Array<{
      id?: string;
      messaging?: Array<{
        sender?: { id?: string };
        recipient?: { id?: string };
        message?: {
          mid?: string;
          text?: string;
          is_echo?: boolean;
          attachments?: unknown[];
        };
      }>;
    }>;
  };
  if (payload.object !== "instagram") return [];

  const messages: InstagramInboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    if (!entry.id) continue;
    for (const event of entry.messaging ?? []) {
      const message = event.message;
      const text = message?.text?.trim();
      if (
        !event.sender?.id ||
        !message?.mid ||
        !text ||
        message.is_echo ||
        message.attachments?.length
      ) {
        continue;
      }
      messages.push({
        accountId: entry.id,
        senderId: event.sender.id,
        messageId: message.mid,
        text: text.slice(0, 2_000),
      });
    }
  }
  return messages;
}

export async function sendInstagramTextMessage(
  pageId: string,
  recipientId: string,
  body: string,
  accessToken: string,
): Promise<boolean> {
  const response = await fetch(`${GRAPH_API}/${pageId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: body.slice(0, 1_000) },
    }),
  });
  if (!response.ok) {
    logger.error(
      { status: response.status, pageId },
      "Instagram send failed",
    );
    return false;
  }
  return true;
}
