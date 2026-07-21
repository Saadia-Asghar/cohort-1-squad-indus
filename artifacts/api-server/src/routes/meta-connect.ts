import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
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
  res.json({
    whatsapp: {
      connected: Boolean(connection?.whatsappPhoneNumberId),
      phoneNumberId: connection?.whatsappPhoneNumberId ?? null,
      wabaId: connection?.whatsappBusinessAccountId ?? null,
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

export default router;
