import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, bakersTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { processChatMessage } from "../lib/chat-agent.js";
import {
  parseWhatsAppWebhook,
  phonesMatch,
  sendWhatsAppTextMessage,
} from "../lib/whatsapp.js";
import { rateLimit } from "../middlewares/rate-limiter.js";

const router = Router();

function resolveVerifyToken(bakerToken?: string | null): string | undefined {
  return bakerToken ?? process.env.WHATSAPP_VERIFY_TOKEN;
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
): Promise<typeof bakersTable.$inferSelect | null> {
  const bakers = await db.select().from(bakersTable);

  const byPhoneId = bakers.find((b) => {
    const conf = (b.agentConfig ?? {}) as { whatsappPhoneNumberId?: string };
    return conf.whatsappPhoneNumberId === phoneNumberId;
  });
  if (byPhoneId?.whatsappAgentEnabled) return byPhoneId;

  if (displayPhoneNumber) {
    const byDisplay = bakers.find(
      (b) => b.whatsappAgentEnabled && phonesMatch(b.whatsappNumber, displayPhoneNumber),
    );
    if (byDisplay) return byDisplay;
  }

  const fallback = bakers.find((b) => b.whatsappAgentEnabled && b.agentActive);
  return fallback ?? null;
}

// Meta inbound messages — POST /webhooks/whatsapp
router.post("/webhooks/whatsapp", rateLimit(100, 60 * 1000), async (req, res): Promise<void> => {
  res.sendStatus(200);

  try {
    const inbound = parseWhatsAppWebhook(req.body);
    for (const msg of inbound) {
      const baker = await findBakerForInbound(msg.phoneNumberId, msg.displayPhoneNumber);
      if (!baker) {
        logger.warn({ phoneNumberId: msg.phoneNumberId }, "No baker matched for WhatsApp message");
        continue;
      }

      if (!baker.whatsappAgentEnabled || !baker.agentActive) {
        logger.info({ bakerId: baker.id }, "WhatsApp agent disabled — skipping auto-reply");
        continue;
      }

      const result = await processChatMessage({
        bakerId: baker.id,
        message: msg.text,
        channel: "whatsapp",
        buyerWhatsapp: msg.from,
        sessionId: `wa-${baker.id}-${msg.from}`,
      });

      const phoneNumberId =
        ((baker.agentConfig ?? {}) as { whatsappPhoneNumberId?: string }).whatsappPhoneNumberId ??
        msg.phoneNumberId;

      await sendWhatsAppTextMessage(phoneNumberId, msg.from, result.reply);
    }
  } catch (err) {
    logger.error({ err }, "WhatsApp webhook processing failed");
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
