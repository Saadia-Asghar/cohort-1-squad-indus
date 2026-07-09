import { text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

export const cartItemsTable = sweetTooth.table("cart_items", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull(),
  bakerId: integer("baker_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  sizeLabel: text("size_label").notNull(),
  variant: text("variant"),
  quantity: integer("quantity").notNull().default(1),
  unitPricePkr: integer("unit_price_pkr").notNull(),
  photoUrl: text("photo_url"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCartItemSchema = createInsertSchema(cartItemsTable).omit({ id: true, addedAt: true });
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItemsTable.$inferSelect;
