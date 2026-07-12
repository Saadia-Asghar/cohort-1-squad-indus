import { text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

export const bakerGoalsTable = sweetTooth.table("baker_goals", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  label: text("label").notNull(),
  metric: text("metric").notNull().default("orders"),
  targetValue: integer("target_value").notNull(),
  period: text("period").notNull().default("monthly"),
  achievedAt: timestamp("achieved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  bakerIdx: index("baker_goals_baker_idx").on(table.bakerId),
}));

export const bakerNotesTable = sweetTooth.table("baker_notes", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  content: text("content").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  bakerIdx: index("baker_notes_baker_idx").on(table.bakerId),
}));

export const bakerRemindersTable = sweetTooth.table("baker_reminders", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  title: text("title").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  bakerIdx: index("baker_reminders_baker_idx").on(table.bakerId),
}));

export const insertBakerGoalSchema = createInsertSchema(bakerGoalsTable).omit({ id: true, createdAt: true, achievedAt: true });
export const insertBakerNoteSchema = createInsertSchema(bakerNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBakerReminderSchema = createInsertSchema(bakerRemindersTable).omit({ id: true, createdAt: true });

export type BakerGoal = typeof bakerGoalsTable.$inferSelect;
export type BakerNote = typeof bakerNotesTable.$inferSelect;
export type BakerReminder = typeof bakerRemindersTable.$inferSelect;
