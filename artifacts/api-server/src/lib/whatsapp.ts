import { logger } from "./logger.js";

const GRAPH_API = "https://graph.facebook.com/v25.0";

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na === nb) return true;
  // +92300... vs 92300... vs 0300...
  const stripCountry = (n: string) => (n.startsWith("92") ? n.slice(2) : n.replace(/^0/, ""));
  return stripCountry(na) === stripCountry(nb) || na.endsWith(nb) || nb.endsWith(na);
}

export async function sendWhatsAppTextMessage(
  phoneNumberId: string,
  to: string,
  body: string,
  accessToken?: string,
): Promise<boolean> {
  const token = accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    logger.warn("WHATSAPP_ACCESS_TOKEN not set — skipping outbound WhatsApp reply");
    return false;
  }

  const recipient = normalizePhone(to);
  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error({ status: res.status, errText, phoneNumberId, to: recipient }, "WhatsApp send failed");
    return false;
  }

  return true;
}

export type WhatsAppInboundMessage = {
  from: string;
  messageId: string;
  text: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
};

export function parseWhatsAppWebhook(body: unknown): WhatsAppInboundMessage[] {
  const messages: WhatsAppInboundMessage[] = [];
  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string; display_phone_number?: string };
          messages?: Array<{
            from: string;
            id: string;
            type: string;
            text?: { body: string };
          }>;
        };
      }>;
    }>;
  };

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages?.length) continue;
      const phoneNumberId = value.metadata?.phone_number_id ?? "";
      const displayPhoneNumber = value.metadata?.display_phone_number;
      for (const msg of value.messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;
        messages.push({
          from: msg.from,
          messageId: msg.id,
          text: msg.text.body,
          phoneNumberId,
          displayPhoneNumber,
        });
      }
    }
  }

  return messages;
}
