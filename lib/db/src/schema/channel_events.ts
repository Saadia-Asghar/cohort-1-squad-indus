import {
  integer,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sweetTooth } from "./pg";

export const channelEventsTable = sweetTooth.table(
  "channel_events",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    bakerId: integer("baker_id").notNull(),
    channel: text("channel").notNull(),
    status: text("status").notNull().default("processing"),
    payloadHash: text("payload_hash").notNull(),
    lastErrorCode: text("last_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    providerEventUnique: unique("channel_events_provider_external_uniq").on(
      table.provider,
      table.externalId,
    ),
  }),
);

export type ChannelEvent = typeof channelEventsTable.$inferSelect;
