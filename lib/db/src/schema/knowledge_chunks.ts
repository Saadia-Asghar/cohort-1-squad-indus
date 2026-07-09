import { text, serial, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sweetTooth } from "./pg";

export const knowledgeChunksTable = sweetTooth.table("knowledge_chunks", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: integer("source_id"),
  chunkIndex: integer("chunk_index").notNull().default(0),
  content: text("content").notNull(),
  embedding: jsonb("embedding").$type<number[]>().notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  bakerIdx: index("knowledge_chunks_baker_idx").on(table.bakerId),
  sourceIdx: index("knowledge_chunks_source_idx").on(table.bakerId, table.sourceType, table.sourceId),
}));

export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKnowledgeChunk = z.infer<typeof insertKnowledgeChunkSchema>;
export type KnowledgeChunk = typeof knowledgeChunksTable.$inferSelect;
