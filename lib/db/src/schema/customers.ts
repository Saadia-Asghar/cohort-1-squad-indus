import { text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

export const customersTable = sweetTooth.table("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  city: text("city"),
  preferredArea: text("preferred_area"),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpentPkr: integer("total_spent_pkr").notNull().default(0),
  lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
  isRegular: boolean("is_regular").notNull().default(false),
  isAtRisk: boolean("is_at_risk").notNull().default(false),
  bakerId: integer("baker_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
