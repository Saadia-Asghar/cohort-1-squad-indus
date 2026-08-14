import { boolean, integer, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sweetTooth } from "./pg";

export const chatHandoffsTable = sweetTooth.table("chat_handoffs", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  buyerId: integer("buyer_id"),
  sessionId: text("session_id").notNull(),
  status: text("status").notNull().default("open"), // open | claimed | resolved
  reason: text("reason").notNull().default("The menu assistant needs human help."),
  assignedMemberId: integer("assigned_member_id"),
  customerNotified: boolean("customer_notified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => ({
  sessionUnique: unique("chat_handoffs_baker_session_uniq").on(table.bakerId, table.sessionId),
}));

export type ChatHandoff = typeof chatHandoffsTable.$inferSelect;
