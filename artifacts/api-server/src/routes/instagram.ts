import crypto from "node:crypto";
import { Router } from "express";
import { and, eq } from "drizzle-orm";
import {
  bakersTable,
  channelEventsTable,
  db,
  metaConnectionsTable,
} from "@workspace/db";
import { logger } from "../lib/logger.js";
import {
  parseInstagramWebhook,
  sendInstagramTextMessage,
} from "../lib/instagram.js";
import { processChatMessage } from "../lib/chat-agent.js";
import { decryptSecret } from "../lib/secret-box.js";

const router = Router();

function hasValidMetaSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(signature);
  return expectedBytes.length === receivedBytes.length &&
    crypto.timingSafeEqual(expectedBytes, receivedBytes);
}

router.get("/webhooks/instagram", (req, res): void => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const configuredToken =
    process.env.META_WEBHOOK_VERIFY_TOKEN ??
    process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    mode === "subscribe" &&
    typeof token === "string" &&
    configuredToken &&
    token === configuredToken
  ) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

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
      channel: "instagram",
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

router.post("/webhooks/instagram", async (req, res): Promise<void> => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  if (!hasValidMetaSignature(rawBody, req.header("x-hub-signature-256"))) {
    logger.warn("Rejected Instagram webhook with invalid signature");
    res.sendStatus(401);
    return;
  }

  try {
    const messages = parseInstagramWebhook(JSON.parse(rawBody.toString("utf8")));
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    for (const message of messages) {
      const [connection] = await db
        .select()
        .from(metaConnectionsTable)
        .where(eq(metaConnectionsTable.instagramAccountId, message.accountId))
        .limit(1);
      if (
        !connection?.instagramAccessTokenEncrypted ||
        !connection.instagramPageId
      ) {
        logger.warn({ accountId: message.accountId }, "No bakery matched for Instagram message");
        continue;
      }

      const [baker] = await db
        .select()
        .from(bakersTable)
        .where(eq(bakersTable.id, connection.bakerId))
        .limit(1);
      if (!baker?.instagramAgentEnabled || !baker.agentActive) continue;

      const eventId = await claimMessage(baker.id, message.messageId, payloadHash);
      if (!eventId) continue;

      try {
        const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
        if (!encryptionKey) throw new Error("TOKEN_ENCRYPTION_KEY is not configured.");
        const accessToken = decryptSecret(
          connection.instagramAccessTokenEncrypted,
          encryptionKey,
        );
        const result = await processChatMessage({
          bakerId: baker.id,
          message: message.text,
          channel: "instagram",
          buyerExternalId: message.senderId,
          sessionId: `ig-${baker.id}-${message.senderId}`,
        });
        const sent = await sendInstagramTextMessage(
          connection.instagramPageId,
          message.senderId,
          result.reply,
          accessToken,
        );
        if (!sent) throw new Error("Instagram outbound reply failed.");

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
  } catch (error) {
    logger.error({ err: error }, "Instagram webhook processing failed");
    res.sendStatus(500);
  }
});

export default router;
