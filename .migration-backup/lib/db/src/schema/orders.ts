import { text, serial, timestamp, integer, jsonb, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

export const ordersTable = sweetTooth.table("orders", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  buyerId: integer("buyer_id"),
  buyerName: text("buyer_name").notNull(),
  buyerWhatsapp: text("buyer_whatsapp").notNull(),
  buyerAddress: text("buyer_address").notNull(),
  buyerArea: text("buyer_area"),
  items: jsonb("items").notNull().default([]),
  totalPkr: integer("total_pkr").notNull(),
  deliveryDate: date("delivery_date", { mode: "string" }),
  status: text("status").notNull().default("new"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentAmountReceived: integer("payment_amount_received"),
  source: text("source").notNull().default("marketplace"),
  occasion: text("occasion"),
  specialInstructions: text("special_instructions"),
  flavour: text("flavour"),
  textOnCake: text("text_on_cake"),
  paymentScreenshotUrl: text("payment_screenshot_url"),
  advancePaid: boolean("advance_paid").notNull().default(false),
  requireAdvance: boolean("require_advance").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
