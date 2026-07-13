import { eq } from "drizzle-orm";
import { db, knowledgeChunksTable } from "@workspace/db";
import { cosineSimilarity, embedText } from "./embeddings.js";

export type RetrievedChunk = {
  id: number;
  content: string;
  sourceType: string;
  sourceId: number | null;
  score: number;
  metadata: Record<string, unknown>;
};

export async function retrieveKnowledge(
  bakerId: number,
  query: string,
  limit = 4,
  minScore = 0.12,
): Promise<RetrievedChunk[]> {
  const chunks = await db.select().from(knowledgeChunksTable).where(eq(knowledgeChunksTable.bakerId, bakerId));
  if (chunks.length === 0) return [];

  const { vector } = await embedText(query);
  const ranked = chunks
    .map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      metadata: (chunk.metadata ?? {}) as Record<string, unknown>,
      score: cosineSimilarity(vector, chunk.embedding),
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
}

export function formatRetrievedContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join("\n\n");
}
