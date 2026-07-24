import { logger } from "./logger.js";

const GRAPH_API = "https://graph.instagram.com/v25.0";

export type InstagramInboundMessage = {
  accountId: string;
  senderId: string;
  messageId: string;
  text: string;
  imageUrl?: string;
  isVoiceOrUnsupportedMedia?: boolean;
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
          attachments?: Array<{
            type?: string;
            payload?: { url?: string };
          }>;
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
      if (!event.sender?.id || !message?.mid || message.is_echo) continue;

      const text = message.text?.trim();
      const attachments = message.attachments ?? [];
      const image = attachments.find((a) => a.type === "image" && a.payload?.url);
      const audio = attachments.find((a) => a.type === "audio" || a.type === "share");

      if (image?.payload?.url) {
        messages.push({
          accountId: entry.id,
          senderId: event.sender.id,
          messageId: message.mid,
          text: text
            ? `[Buyer sent a photo] ${text}`
            : "[Buyer sent a photo] Please confirm if this is a payment receipt or type your question.",
          imageUrl: image.payload.url,
        });
        continue;
      }

      if (audio && !text) {
        messages.push({
          accountId: entry.id,
          senderId: event.sender.id,
          messageId: message.mid,
          text: "[Buyer sent a voice/audio message] Please type your question in text so I can help.",
          isVoiceOrUnsupportedMedia: true,
        });
        continue;
      }

      if (!text) continue;
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
    logger.error({ status: response.status, pageId }, "Instagram send failed");
    return false;
  }
  return true;
}
