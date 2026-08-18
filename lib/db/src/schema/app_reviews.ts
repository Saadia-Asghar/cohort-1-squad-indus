import { text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

export const appReviewsTable = sweetTooth.table("app_reviews", {
  id: serial("id").primaryKey(),
  reviewerName: text("reviewer_name").notNull(),
  email: text("email"),
  role: text("role").notNull(),
  rating: integer("rating").notNull(),
  reviewText: text("review_text").notNull(),
  usedHow: text("used_how"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAppReviewSchema = createInsertSchema(appReviewsTable).omit({ id: true, createdAt: true });
export type InsertAppReview = z.infer<typeof insertAppReviewSchema>;
export type AppReview = typeof appReviewsTable.$inferSelect;
