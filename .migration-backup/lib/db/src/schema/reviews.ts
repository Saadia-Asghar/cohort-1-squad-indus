import { text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

export const reviewsTable = sweetTooth.table("reviews", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  buyerId: integer("buyer_id"),
  orderId: integer("order_id"),
  buyerName: text("buyer_name").notNull(),
  rating: integer("rating").notNull(),
  ratingProduct: integer("rating_product"),
  ratingPackaging: integer("rating_packaging"),
  reviewText: text("review_text"),
  productName: text("product_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
