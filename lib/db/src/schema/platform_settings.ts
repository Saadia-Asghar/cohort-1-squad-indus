import { jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { sweetTooth } from "./pg";

export const platformSettingsTable = sweetTooth.table("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
