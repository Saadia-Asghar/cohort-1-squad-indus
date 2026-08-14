import { Router } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  channelEventsTable,
  metaConnectionsTable,
} from "@workspace/db";
import {
  type AuthenticatedRequest,
  requireBakerAuth,
} from "../middlewares/auth.js";
import { encryptSecret } from "../lib/secret-box.js";

const router = Router();
const GRAPH_API = "https://graph.facebook.com/v25.0";

function requiredMetaConfiguration() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!appId || !appSecret || !encryptionKey) {
    throw new Error("Meta connection credentials are not configured.");
  }
  return { appId, appSecret, encryptionKey };
}

async function graphJson<T>(
  path: string,
  accessToken?: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${GRAPH_API}${path}`, { ...init, headers });
  const payload = (await response.json()) as T & {
    error?: { message?: string; code?: number };
  };
  if (!response.ok || payload.error) {
    throw new Error(`Meta API request failed (${payload.error?.code ?? response.status}).`);
  }
  return payload;
}

router.get("/meta/connections", requireBakerAuth, async (req, res): Promise<void> => {
  const bakerId = (req as AuthenticatedRequest).bakerId!;
  const [connection] = await db
    .select()
    .from(metaConnectionsTable)
    .where(eq(metaConnectionsTable.bakerId, bakerId))
    .limit(1);
  const [lastWhatsAppEvent] = await db
    .select({ status: channelEventsTable.status, createdAt: channelEventsTable.createdAt, lastErrorCode: channelEventsTable.lastErrorCode })
    .from(channelEventsTable)
    .where(and(eq(channelEventsTable.bakerId, bakerId), eq(channelEventsTable.channel, "whatsapp")))
    .orderBy(desc(channelEventsTable.createdAt))
    .limit(1);
  const [failureSummary] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(channelEventsTable)
    .where(and(
      eq(channelEventsTable.bakerId, bakerId),
      eq(channelEventsTable.channel, "whatsapp"),
      eq(channelEventsTable.status, "failed"),
      gte(channelEventsTable.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
    ));
  res.json({
    whatsapp: {
      connected: Boolean(connection?.whatsappPhoneNumberId),
      phoneNumberId: connection?.whatsappPhoneNumberId ?? null,
      wabaId: connection?.whatsappBusinessAccountId ?? null,
      lastEventAt: lastWhatsAppEvent?.createdAt ?? null,
      lastEventStatus: lastWhatsAppEvent?.status ?? null,
      lastErrorCode: lastWhatsAppEvent?.lastErrorCode ?? null,
      failuresLast24Hours: failureSummary?.count ?? 0,
    },
    instagram: {
      connected: Boolean(connection?.instagramAccountId),
      accountId: connection?.instagramAccountId ?? null,
      pageId: connection?.instagramPageId ?? null,
    },
    status: connection?.status ?? "not_connected",
    lastVerifiedAt: connection?.lastVerifiedAt ?? null,
  });
});

router.post(
  "/meta/whatsapp/complete",
  requireBakerAuth,
  async (req, res): Promise<void> => {
    const parsed = z.object({
      code: z.string().min(10).max(2_000),
      wabaId: z.string().regex(/^\d{5,40}$/),
      phoneNumberId: z.string().regex(/^\d{5,40}$/),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid Embedded Signup response." });
      return;
    }

    const { appId, appSecret, encryptionKey } = requiredMetaConfiguration();
    const tokenResult = await graphJson<{
      access_token: string;
      token_type?: string;
      expires_in?: number;
    }>(
      `/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(parsed.data.code)}`,
    );

    const appAccessToken = `${appId}|${appSecret}`;
    const debug = await graphJson<{
      data: {
        app_id: string;
        is_valid: boolean;
        expires_at?: number;
        scopes?: string[];
        granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
      };
    }>(
      `/debug_token?input_token=${encodeURIComponent(tokenResult.access_token)}&access_token=${encodeURIComponent(appAccessToken)}`,
    );
    const wabaAllowed = debug.data.granular_scopes?.some(
      (scope) =>
        scope.scope === "whatsapp_business_management" &&
        scope.target_ids?.includes(parsed.data.wabaId),
    );
    if (
      !debug.data.is_valid ||
      debug.data.app_id !== appId ||
      !debug.data.scopes?.includes("whatsapp_business_messaging") ||
      !wabaAllowed
    ) {
      res.status(403).json({ error: "Meta did not grant the required WhatsApp permissions." });
      return;
    }

    const phoneNumbers = await graphJson<{
      data: Array<{ id: string; display_phone_number?: string; verified_name?: string }>;
    }>(
      `/${parsed.data.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
      tokenResult.access_token,
    );
    const phone = phoneNumbers.data.find((item) => item.id === parsed.data.phoneNumberId);
    if (!phone) {
      res.status(403).json({ error: "The selected phone number does not belong to the granted WhatsApp account." });
      return;
    }

    await graphJson(
      `/${parsed.data.wabaId}/subscribed_apps`,
      tokenResult.access_token,
      { method: "POST" },
    );

    const bakerId = (req as AuthenticatedRequest).bakerId!;
    const encryptedToken = encryptSecret(tokenResult.access_token, encryptionKey);
    const tokenExpiresAt =
      debug.data.expires_at && debug.data.expires_at > 0
        ? new Date(debug.data.expires_at * 1_000)
        : null;
    const values = {
      bakerId,
      whatsappBusinessAccountId: parsed.data.wabaId,
      whatsappPhoneNumberId: parsed.data.phoneNumberId,
      whatsappAccessTokenEncrypted: encryptedToken,
      grantedScopes: debug.data.scopes ?? [],
      tokenExpiresAt,
      lastVerifiedAt: new Date(),
      status: "connected",
      metadata: {
        whatsappDisplayNumber: phone.display_phone_number ?? null,
        whatsappVerifiedName: phone.verified_name ?? null,
      },
    };
    const [connection] = await db
      .insert(metaConnectionsTable)
      .values(values)
      .onConflictDoUpdate({
        target: metaConnectionsTable.bakerId,
        set: values,
      })
      .returning();

    res.json({
      connected: true,
      phoneNumberId: connection.whatsappPhoneNumberId,
      wabaId: connection.whatsappBusinessAccountId,
      displayPhoneNumber: phone.display_phone_number ?? null,
      verifiedName: phone.verified_name ?? null,
    });
  },
);

router.post(
  "/meta/instagram/complete",
  requireBakerAuth,
  async (req, res): Promise<void> => {
    const parsed = z.object({
      code: z.string().min(10).max(2_000),
      pageId: z.string().regex(/^\d{5,40}$/),
      instagramAccountId: z.string().regex(/^\d{5,40}$/),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid Instagram connection payload." });
      return;
    }

    const { appId, appSecret, encryptionKey } = requiredMetaConfiguration();
    const tokenResult = await graphJson<{
      access_token: string;
      token_type?: string;
      expires_in?: number;
    }>(
      `/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(parsed.data.code)}`,
    );

    const appAccessToken = `${appId}|${appSecret}`;
    const debug = await graphJson<{
      data: {
        app_id: string;
        is_valid: boolean;
        expires_at?: number;
        scopes?: string[];
        granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
      };
    }>(
      `/debug_token?input_token=${encodeURIComponent(tokenResult.access_token)}&access_token=${encodeURIComponent(appAccessToken)}`,
    );

    const scopes = debug.data.scopes ?? [];
    const hasMessagingScope = scopes.some((scope) =>
      [
        "instagram_manage_messages",
        "pages_messaging",
        "instagram_basic",
        "instagram_manage_comments",
      ].includes(scope),
    );
    if (!debug.data.is_valid || debug.data.app_id !== appId || !hasMessagingScope) {
      res.status(403).json({ error: "Meta did not grant the required Instagram permissions." });
      return;
    }

    // Resolve the Facebook Page and confirm the linked Instagram business account.
    const pages = await graphJson<{
      data: Array<{
        id: string;
        name?: string;
        access_token?: string;
        instagram_business_account?: { id: string };
      }>;
    }>(
      `/me/accounts?fields=id,name,access_token,instagram_business_account`,
      tokenResult.access_token,
    );
    const page = pages.data.find((item) => item.id === parsed.data.pageId);
    if (!page) {
      res.status(403).json({ error: "The selected Page does not belong to the granted Meta account." });
      return;
    }
    const linkedIgId = page.instagram_business_account?.id;
    if (!linkedIgId || linkedIgId !== parsed.data.instagramAccountId) {
      res.status(403).json({
        error: "The Instagram account is not linked to the selected Facebook Page.",
      });
      return;
    }

    // Prefer a long-lived page token for messaging when Meta returns one.
    const tokenToStore = page.access_token || tokenResult.access_token;
    const bakerId = (req as AuthenticatedRequest).bakerId!;
    const encryptedToken = encryptSecret(tokenToStore, encryptionKey);
    const tokenExpiresAt =
      debug.data.expires_at && debug.data.expires_at > 0
        ? new Date(debug.data.expires_at * 1_000)
        : null;

    const [existing] = await db
      .select()
      .from(metaConnectionsTable)
      .where(eq(metaConnectionsTable.bakerId, bakerId))
      .limit(1);

    const mergedScopes = Array.from(
      new Set([...(existing?.grantedScopes ?? []), ...scopes]),
    );
    const igFields = {
      bakerId,
      instagramPageId: parsed.data.pageId,
      instagramAccountId: parsed.data.instagramAccountId,
      instagramAccessTokenEncrypted: encryptedToken,
      grantedScopes: mergedScopes,
      tokenExpiresAt: tokenExpiresAt ?? existing?.tokenExpiresAt ?? null,
      lastVerifiedAt: new Date(),
      status: "connected",
      metadata: {
        ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
        instagramPageName: page.name ?? null,
      },
    };

    const [connection] = existing
      ? await db
          .update(metaConnectionsTable)
          .set(igFields)
          .where(eq(metaConnectionsTable.bakerId, bakerId))
          .returning()
      : await db.insert(metaConnectionsTable).values(igFields).returning();

    res.json({
      connected: true,
      pageId: connection.instagramPageId,
      accountId: connection.instagramAccountId,
      pageName: page.name ?? null,
    });
  },
);

export default router;
