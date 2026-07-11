import { pgTable, text, serial, timestamp, integer, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  cakeType: text("cake_type").notNull(),
  flavor: text("flavor"),
  weight: text("weight"),
  designNotes: text("design_notes"),
  deliveryDate: date("delivery_date", { mode: "string" }),
  deliveryTime: text("delivery_time"),
  deliveryType: text("delivery_type").notNull().default("delivery"),
  price: real("price").notNull().default(0),
  paymentStatus: text("payment_status").notNull().default("pending"),
  status: text("status").notNull().default("confirmed"),
  specialRequests: text("special_requests"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  confidence: integer("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
