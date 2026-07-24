/**
 * Optional Langfuse tracing for the bakery chat agent.
 *
 * Free path: Langfuse Cloud Hobby — https://cloud.langfuse.com (no credit card,
 * 50k units/mo). Self-host OSS is also free of license cost but needs your infra.
 *
 * When LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY are unset, this is a no-op.
 * Never throws into the chat path.
 */
import { randomUUID } from "node:crypto";
import { logger } from "./logger.js";

export type AgentTraceInput = {
  bakerId: number;
  buyerId: number | null;
  sessionId: string;
  channel: string;
  message: string;
  reply: string;
  action: string | null;
  escalated: boolean;
  latencyMs: number;
};

function credentials(): { publicKey: string; secretKey: string; baseUrl: string } | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
  if (!publicKey || !secretKey) return null;
  const baseUrl = (process.env.LANGFUSE_BASE_URL?.trim() || "https://cloud.langfuse.com").replace(/\/$/, "");
  return { publicKey, secretKey, baseUrl };
}

export function isLangfuseEnabled(): boolean {
  return credentials() !== null;
}

/** Fire-and-forget agent turn → Langfuse (Hobby / self-hosted). */
export function traceAgentTurn(input: AgentTraceInput): void {
  const creds = credentials();
  if (!creds) return;

  const started = Date.now();
  void (async () => {
    try {
      const traceId = randomUUID();
      const spanId = randomUUID();
      const now = new Date().toISOString();
      const tags = [
        "sweet-tooth",
        "chat-agent",
        input.channel,
        input.escalated ? "escalated" : "resolved",
        ...(input.action ? [`action:${input.action}`] : []),
      ];

      const auth = Buffer.from(`${creds.publicKey}:${creds.secretKey}`).toString("base64");
      const res = await fetch(`${creds.baseUrl}/api/public/ingestion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          batch: [
            {
              id: randomUUID(),
              type: "trace-create",
              timestamp: now,
              body: {
                id: traceId,
                name: "chat-agent",
                timestamp: now,
                userId: input.buyerId != null ? `buyer-${input.buyerId}` : undefined,
                sessionId: input.sessionId,
                input: { message: input.message },
                output: {
                  reply: input.reply,
                  action: input.action,
                  escalated: input.escalated,
                },
                metadata: {
                  bakerId: input.bakerId,
                  channel: input.channel,
                  latencyMs: input.latencyMs,
                  agentType: "rule-based",
                },
                tags,
              },
            },
            {
              id: randomUUID(),
              type: "span-create",
              timestamp: now,
              body: {
                id: spanId,
                traceId,
                name: "generateAgentReply",
                startTime: new Date(started - input.latencyMs).toISOString(),
                endTime: now,
                input: { message: input.message },
                output: {
                  reply: input.reply,
                  action: input.action,
                  escalated: input.escalated,
                },
                metadata: {
                  bakerId: input.bakerId,
                  latencyMs: input.latencyMs,
                },
              },
            },
          ],
        }),
      });

      if (!res.ok && res.status !== 207) {
        const body = await res.text().catch(() => "");
        logger.warn({ status: res.status, body: body.slice(0, 300) }, "Langfuse ingestion failed");
      }
    } catch (err) {
      logger.warn({ err }, "Langfuse trace skipped");
    }
  })();
}
