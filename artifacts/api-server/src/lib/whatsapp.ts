import { logger } from "./logger.js";
import { toReceiptDataUrl } from "./receipt-image.js";
import { performReceiptOCRFromBytes } from "./ocr.js";
import { verifyReceiptText } from "./receipt-analyzer.js";

const GRAPH_API = "https://graph.facebook.com/v25.0";

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na === nb) return true;
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
  /** When set, raw image bytes were downloaded for OCR / receipt attach. */
  imageBytes?: Buffer;
  imageContentType?: string;
  isVoiceOrUnsupportedMedia?: boolean;
};

type WaMsg = {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  image?: { id?: string; caption?: string; mime_type?: string };
  audio?: { id?: string };
  voice?: { id?: string };
  document?: { id?: string; caption?: string };
  sticker?: { id?: string };
};

export async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const metaRes = await fetch(`${GRAPH_API}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (!metaRes.ok) return null;
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!meta.url) return null;
    const fileRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!fileRes.ok) return null;
    const bytes = Buffer.from(await fileRes.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 4 * 1024 * 1024) return null;
    return {
      bytes,
      contentType: meta.mime_type ?? fileRes.headers.get("content-type") ?? "image/jpeg",
    };
  } catch (err) {
    logger.warn({ err, mediaId }, "WhatsApp media download failed");
    return null;
  }
}

export function parseWhatsAppWebhook(body: unknown): Array<WhatsAppInboundMessage & { rawImageId?: string; rawMime?: string }> {
  const messages: Array<WhatsAppInboundMessage & { rawImageId?: string; rawMime?: string }> = [];
  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string; display_phone_number?: string };
          messages?: WaMsg[];
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
        if (msg.type === "text" && msg.text?.body) {
          messages.push({
            from: msg.from,
            messageId: msg.id,
            text: msg.text.body,
            phoneNumberId,
            displayPhoneNumber,
          });
          continue;
        }
        if (msg.type === "image" && msg.image?.id) {
          const caption = msg.image.caption?.trim() ?? "";
          messages.push({
            from: msg.from,
            messageId: msg.id,
            text: caption
              ? `[Buyer sent a photo] ${caption}`
              : "[Buyer sent a photo] Please confirm if this is a payment receipt or ask your question in text.",
            phoneNumberId,
            displayPhoneNumber,
            rawImageId: msg.image.id,
            rawMime: msg.image.mime_type,
          });
          continue;
        }
        if (msg.type === "audio" || msg.type === "voice") {
          messages.push({
            from: msg.from,
            messageId: msg.id,
            text: "[Buyer sent a voice note] Please type your question in text so I can help.",
            phoneNumberId,
            displayPhoneNumber,
            isVoiceOrUnsupportedMedia: true,
          });
          continue;
        }
        if (msg.type === "document" && msg.document?.caption) {
          messages.push({
            from: msg.from,
            messageId: msg.id,
            text: `[Buyer sent a document] ${msg.document.caption}`,
            phoneNumberId,
            displayPhoneNumber,
          });
        }
      }
    }
  }

  return messages;
}

/** Enrich inbound messages by downloading images when a token is available. */
export async function enrichWhatsAppMessagesWithMedia(
  messages: Array<WhatsAppInboundMessage & { rawImageId?: string; rawMime?: string }>,
  accessToken?: string,
): Promise<WhatsAppInboundMessage[]> {
  const out: WhatsAppInboundMessage[] = [];
  for (const msg of messages) {
    const { rawImageId, rawMime, ...rest } = msg;
    if (!rawImageId || !accessToken) {
      out.push(rest);
      continue;
    }
    const media = await downloadWhatsAppMedia(rawImageId, accessToken);
    if (!media) {
      out.push(rest);
      continue;
    }
    const contentType = (media.contentType.split(";")[0] ?? "image/jpeg").trim().toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(contentType)) {
      out.push(rest);
      continue;
    }
    const normalizedType = contentType === "image/jpg" ? "image/jpeg" : contentType;
    try {
      // Validate as receipt-capable image
      toReceiptDataUrl(media.bytes, normalizedType);
      out.push({
        ...rest,
        imageBytes: media.bytes,
        imageContentType: normalizedType,
      });
    } catch {
      out.push(rest);
    }
  }
  return out;
}

export async function ocrWhatsAppImageHint(
  imageBytes: Buffer,
  expectedAmountPkr?: number,
  advancePercentage = 50,
  bakerPhone?: string,
  businessName?: string,
): Promise<string | null> {
  try {
    const text = await performReceiptOCRFromBytes(imageBytes);
    if (expectedAmountPkr && businessName) {
      const result = verifyReceiptText(
        text,
        expectedAmountPkr,
        advancePercentage,
        bakerPhone ?? "",
        businessName,
      );
      return `OCR note: ${result.message}`;
    }
    return text.slice(0, 400);
  } catch {
    return null;
  }
}
