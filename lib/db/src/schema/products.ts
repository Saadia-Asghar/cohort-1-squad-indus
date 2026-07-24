import { text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

export const productsTable = sweetTooth.table("products", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  basePricePkr: integer("base_price_pkr").notNull(),
  recipeCostPkr: integer("recipe_cost_pkr"),
  sizes: jsonb("sizes").notNull().default([]),
  variants: text("variants").array().notNull().default([]),
  isEgglessAvailable: boolean("is_eggless_available").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  leadTimeDays: integer("lead_time_days").notNull().default(1),
  category: text("category").notNull(),
  occasionTags: text("occasion_tags").array().notNull().default([]),
  dietaryTags: text("dietary_tags").array().notNull().default([]),
  ingredients: text("ingredients").array().notNull().default([]),
  allergens: text("allergens").array().notNull().default([]),
  suggestionTags: text("suggestion_tags").array().notNull().default([]),
  pickupAvailable: boolean("pickup_available").notNull().default(true),
  deliveryAvailable: boolean("delivery_available").notNull().default(true),
  leadTimeHours: integer("lead_time_hours"),
  photoUrl: text("photo_url"),
  totalOrders: integer("total_orders").notNull().default(0),
  isBestSeller: boolean("is_best_seller").notNull().default(false),
  isTopRated: boolean("is_top_rated").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true, totalOrders: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
