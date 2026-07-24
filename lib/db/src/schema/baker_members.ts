import { text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

/** Extra dashboard logins for a bakery (Bakery Team = 2 seats including owner). */
export const bakerMembersTable = sweetTooth.table("baker_members", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  clerkUserId: text("clerk_user_id").unique(),
  role: text("role").notNull().default("staff"), // owner | staff
  displayName: text("display_name").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBakerMemberSchema = createInsertSchema(bakerMembersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBakerMember = z.infer<typeof insertBakerMemberSchema>;
export type BakerMember = typeof bakerMembersTable.$inferSelect;
