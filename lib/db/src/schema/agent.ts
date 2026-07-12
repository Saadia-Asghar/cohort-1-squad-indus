import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bakerKnowledgeTable = pgTable("baker_knowledge", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  bakerName: text("baker_name").notNull().default("Zara Ahmed"),
  businessName: text("business_name").notNull().default("Sweet Tooth"),
  whatsappNumber: text("whatsapp_number"),
  deliveryArea: text("delivery_area"),
  deliveryFee: text("delivery_fee"),
  minimumOrder: text("minimum_order"),
  paymentMethods: text("payment_methods"),
  businessHours: text("business_hours"),
  customPolicies: text("custom_policies"),
  menu: jsonb("menu").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBakerKnowledgeSchema = createInsertSchema(bakerKnowledgeTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBakerKnowledge = z.infer<typeof insertBakerKnowledgeSchema>;
export type BakerKnowledge = typeof bakerKnowledgeTable.$inferSelect;

export const chatSessionsTable = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  sessionId: text("session_id").notNull().unique(),
  customerName: text("customer_name"),
  messages: jsonb("messages").notNull().default([]),
  orderCreated: text("order_created"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertChatSessionSchema = createInsertSchema(chatSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessionsTable.$inferSelect;
