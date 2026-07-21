import { Router } from "express";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";
import {
  bakersTable,
  channelEventsTable,
  db,
  metaConnectionsTable,
} from "@workspace/db";
import { logger } from "../lib/logger.js";
import { processChatMessage } from "../lib/chat-agent.js";
import {
  parseWhatsAppWebhook,
  phonesMatch,
  sendWhatsAppTextMessage,
} from "../lib/whatsapp.js";
import { decryptSecret } from "../lib/secret-box.js";

const router = Router();

function resolveVerifyToken(bakerToken?: string | null): string | undefined {
  return bakerToken ?? process.env.META_WEBHOOK_VERIFY_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN;
}

function hasValidMetaSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(signature);
  return expectedBytes.length === receivedBytes.length && crypto.timingSafeEqual(expectedBytes, receivedBytes);
}

// Meta webhook verification — GET /webhooks/whatsapp
router.get("/webhooks/whatsapp", async (req, res): Promise<void> => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode !== "subscribe" || typeof token !== "string") {
    res.sendStatus(403);
    return;
  }

  const bakers = await db.select().from(bakersTable);
  const matched = bakers.some((b) => resolveVerifyToken(b.metaWebhookToken) === token);
  const envMatch = process.env.WHATSAPP_VERIFY_TOKEN === token;

  if (matched || envMatch) {
    logger.info("WhatsApp webhook verified");
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

async function findBakerForInbound(
  phoneNumberId: string,
  displayPhoneNumber?: string,
): Promise<{
  baker: typeof bakersTable.$inferSelect;
  accessToken?: string;
} | null> {
  const [connection] = await db
    .select()
    .from(metaConnectionsTable)
    .where(eq(metaConnectionsTable.whatsappPhoneNumberId, phoneNumberId))
    .limit(1);
  if (connection) {
    const [baker] = await db
      .select()
      .from(bakersTable)
      .where(eq(bakersTable.id, connection.bakerId))
      .limit(1);
    if (baker?.whatsappAgentEnabled) {
      const encryptedToken = connection.whatsappAccessTokenEncrypted;
      const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
      if (encryptedToken && !encryptionKey) {
        throw new Error("TOKEN_ENCRYPTION_KEY is required for connected WhatsApp accounts.");
      }
      return {
        baker,
        accessToken:
          encryptedToken && encryptionKey
            ? decryptSecret(encryptedToken, encryptionKey)
            : undefined,
      };
    }
  }

  const bakers = await db.select().from(bakersTable);

  const byPhoneId = bakers.find((b) => {
    const conf = (b.agentConfig ?? {}) as { whatsappPhoneNumberId?: string };
    return conf.whatsappPhoneNumberId === phoneNumberId;
  });
  if (byPhoneId?.whatsappAgentEnabled) return { baker: byPhoneId };

  if (displayPhoneNumber) {
    const byDisplay = bakers.find(
      (b) => b.whatsappAgentEnabled && phonesMatch(b.whatsappNumber, displayPhoneNumber),
    );
    if (byDisplay) return { baker: byDisplay };
  }

  // A message that cannot be tied to a configured bakery must never be
  // routed to another bakery merely because its agent happens to be enabled.
  return null;
}

async function claimMessage(
  bakerId: number,
  messageId: string,
  payloadHash: string,
): Promise<number | null> {
  const [inserted] = await db
    .insert(channelEventsTable)
    .values({
      provider: "meta",
      externalId: messageId,
      bakerId,
      channel: "whatsapp",
      status: "processing",
      payloadHash,
    })
    .onConflictDoNothing()
    .returning({ id: channelEventsTable.id });
  if (inserted) return inserted.id;

  const [retried] = await db
    .update(channelEventsTable)
    .set({ status: "processing", lastErrorCode: null })
    .where(
      and(
        eq(channelEventsTable.provider, "meta"),
        eq(channelEventsTable.externalId, messageId),
        eq(channelEventsTable.status, "failed"),
      ),
    )
    .returning({ id: channelEventsTable.id });
  return retried?.id ?? null;
}

// Meta inbound messages — POST /webhooks/whatsapp
router.post("/webhooks/whatsapp", async (req, res): Promise<void> => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  if (!hasValidMetaSignature(rawBody, req.header("x-hub-signature-256"))) {
    logger.warn("Rejected WhatsApp webhook with invalid signature");
    res.sendStatus(401);
    return;
  }

  try {
    const inbound = parseWhatsAppWebhook(JSON.parse(rawBody.toString("utf8")));
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    for (const msg of inbound) {
      const resolved = await findBakerForInbound(msg.phoneNumberId, msg.displayPhoneNumber);
      if (!resolved) {
        logger.warn({ phoneNumberId: msg.phoneNumberId }, "No baker matched for WhatsApp message");
        continue;
      }
      const { baker, accessToken } = resolved;

      if (!baker.whatsappAgentEnabled || !baker.agentActive) {
        logger.info({ bakerId: baker.id }, "WhatsApp agent disabled — skipping auto-reply");
        continue;
      }

      const eventId = await claimMessage(baker.id, msg.messageId, payloadHash);
      if (!eventId) {
        logger.info({ messageId: msg.messageId }, "Skipping duplicate WhatsApp message");
        continue;
      }

      try {
        const result = await processChatMessage({
          bakerId: baker.id,
          message: msg.text,
          channel: "whatsapp",
          buyerWhatsapp: msg.from,
          sessionId: `wa-${baker.id}-${msg.from}`,
        });

        const outboundPhoneNumberId =
          ((baker.agentConfig ?? {}) as { whatsappPhoneNumberId?: string }).whatsappPhoneNumberId ??
          msg.phoneNumberId;
        const sent = await sendWhatsAppTextMessage(
          outboundPhoneNumberId,
          msg.from,
          result.reply,
          accessToken,
        );
        if (!sent) throw new Error("WhatsApp outbound reply failed.");

        await db
          .update(channelEventsTable)
          .set({ status: "completed", completedAt: new Date(), lastErrorCode: null })
          .where(eq(channelEventsTable.id, eventId));
      } catch (error) {
        await db
          .update(channelEventsTable)
          .set({ status: "failed", lastErrorCode: "PROCESSING_FAILED" })
          .where(eq(channelEventsTable.id, eventId));
        throw error;
      }
    }
    res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, "WhatsApp webhook processing failed");
    res.sendStatus(500);
  }
});

// Setup helper — returns webhook URL and checklist for Agent Hub
router.get("/webhooks/whatsapp/setup", (_req, res): void => {
  const base =
    process.env.PUBLIC_API_URL ??
    (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : `http://localhost:${process.env.PORT ?? 8080}`);

  res.json({
    webhookUrl: `${base}/api/webhooks/whatsapp`,
    verifyTokenEnv: "WHATSAPP_VERIFY_TOKEN",
    accessTokenEnv: "WHATSAPP_ACCESS_TOKEN",
    steps: [
      "Create a Meta app → WhatsApp → API Setup",
      "Set Callback URL to webhookUrl above",
      "Set Verify Token to WHATSAPP_VERIFY_TOKEN (or per-baker token in Agent Hub)",
      "Subscribe to messages field",
      "Add WHATSAPP_ACCESS_TOKEN to server env",
      "Enable WhatsApp Agent in Agent Hub for your baker",
      "Optional: save whatsappPhoneNumberId in agent config JSON for multi-baker",
    ],
  });
});

export default router;
