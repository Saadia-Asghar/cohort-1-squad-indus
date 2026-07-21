import {
  integer,
  jsonb,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sweetTooth } from "./pg";

export const metaConnectionsTable = sweetTooth.table(
  "meta_connections",
  {
    id: serial("id").primaryKey(),
    bakerId: integer("baker_id").notNull(),
    metaBusinessId: text("meta_business_id"),
    whatsappBusinessAccountId: text("whatsapp_business_account_id"),
    whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
    whatsappAccessTokenEncrypted: text("whatsapp_access_token_encrypted"),
    instagramPageId: text("instagram_page_id"),
    instagramAccountId: text("instagram_account_id"),
    instagramAccessTokenEncrypted: text("instagram_access_token_encrypted"),
    grantedScopes: text("granted_scopes").array().notNull().default([]),
    status: text("status").notNull().default("pending"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    bakerUnique: unique("meta_connections_baker_uniq").on(table.bakerId),
    whatsappPhoneUnique: unique("meta_connections_phone_id_uniq").on(table.whatsappPhoneNumberId),
    instagramAccountUnique: unique("meta_connections_instagram_account_uniq").on(table.instagramAccountId),
  }),
);

export type MetaConnection = typeof metaConnectionsTable.$inferSelect;
