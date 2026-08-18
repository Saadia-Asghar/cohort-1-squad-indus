import { text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

export const whatsappWaitlistTable = sweetTooth.table("whatsapp_waitlist", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id"),
  bakerName: text("baker_name").notNull(),
  bakerEmail: text("baker_email").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  note: text("note"),
  source: text("source").notNull().default("whatsapp"),
  city: text("city"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWaitlistSchema = createInsertSchema(whatsappWaitlistTable).omit({ id: true, createdAt: true });
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type WaitlistEntry = typeof whatsappWaitlistTable.$inferSelect;
