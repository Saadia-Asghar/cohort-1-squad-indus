import { text, serial, timestamp, integer, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

export const bakersTable = sweetTooth.table("bakers", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull().default(""),
  tagline: text("tagline"),
  bio: text("bio"),
  city: text("city").notNull(),
  area: text("area"),
  whatsappNumber: text("whatsapp_number").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  requireAdvance: boolean("require_advance").notNull().default(false),
  advanceThresholdPkr: integer("advance_threshold_pkr").notNull().default(2000),
  advancePercentage: integer("advance_percentage").notNull().default(50),
  paymentDetails: text("payment_details").notNull().default(""),
  deliveryAreas: text("delivery_areas").array().notNull().default([]),
  codPolicy: text("cod_policy"),
  returnPolicy: text("return_policy"),
  maxOrdersPerDay: integer("max_orders_per_day").notNull().default(10),
  agentActive: boolean("agent_active").notNull().default(true),
  agentConfig: jsonb("agent_config").$type<{
    customGreeting?: string;
    blockedTopics?: string[];
    escalateKeywords?: string[];
    autoReplyEnabled?: boolean;
    customResponses?: Array<{ trigger: string; response: string }>;
  }>().default({}),
  whatsappAgentEnabled: boolean("whatsapp_agent_enabled").notNull().default(false),
  instagramAgentEnabled: boolean("instagram_agent_enabled").notNull().default(false),
  metaWebhookToken: text("meta_webhook_token"),
  instagramPageId: text("instagram_page_id"),
  marketplaceVisible: boolean("marketplace_visible").notNull().default(true),
  subscriptionPlan: text("subscription_plan").notNull().default("free"),
  ratingAvg: real("rating_avg").notNull().default(0),
  totalOrders: integer("total_orders").notNull().default(0),
  slug: text("slug").notNull().unique(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBakerSchema = createInsertSchema(bakersTable).omit({ id: true, createdAt: true, updatedAt: true, ratingAvg: true, totalOrders: true, passwordHash: true });
export type InsertBaker = z.infer<typeof insertBakerSchema>;
export type Baker = typeof bakersTable.$inferSelect;
