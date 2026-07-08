import { pgTable, text, serial, timestamp, integer, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversationMemoryTable = pgTable("conversation_memory", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  buyerName: text("buyer_name"),
  summary: text("summary"),
  preferences: jsonb("preferences").$type<{
    eggless?: boolean;
    preferredArea?: string;
    favoriteProducts?: string[];
    allergies?: string[];
    usualOrderSize?: string;
  }>().default({}),
  messageCount: integer("message_count").notNull().default(0),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniq: unique("conv_memory_baker_buyer_uniq").on(table.bakerId, table.buyerId),
}));

export const insertConversationMemorySchema = createInsertSchema(conversationMemoryTable).omit({ id: true, createdAt: true });
export type InsertConversationMemory = z.infer<typeof insertConversationMemorySchema>;
export type ConversationMemory = typeof conversationMemoryTable.$inferSelect;
