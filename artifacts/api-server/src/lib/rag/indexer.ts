import { eq } from "drizzle-orm";
import { db, bakersTable, productsTable, knowledgeChunksTable } from "@workspace/db";
import { embedText } from "./embeddings.js";

type ChunkDraft = {
  sourceType: string;
  sourceId?: number;
  chunkIndex: number;
  content: string;
  metadata?: Record<string, unknown>;
};

function productChunks(product: typeof productsTable.$inferSelect): ChunkDraft[] {
  const sizes = (product.sizes as Array<{ label: string; pricePkr: number }> | null) ?? [];
  const sizeText = sizes.length
    ? sizes.map((s) => `${s.label}: PKR ${s.pricePkr}`).join(", ")
    : `PKR ${product.basePricePkr}`;

  const content = [
    `Product: ${product.name}`,
    product.description ? `Description: ${product.description}` : "",
    `Category: ${product.category}`,
    `Pricing: ${sizeText}`,
    product.isEgglessAvailable ? "Eggless version available." : "",
    product.leadTimeDays > 0 ? `Lead time: ${product.leadTimeDays} day(s).` : "",
    product.occasionTags?.length ? `Occasions: ${product.occasionTags.join(", ")}` : "",
    product.dietaryTags?.length ? `Dietary: ${product.dietaryTags.join(", ")}` : "",
    product.isAvailable ? "Status: in stock." : "Status: sold out.",
  ].filter(Boolean).join("\n");

  return [{
    sourceType: "product",
    sourceId: product.id,
    chunkIndex: 0,
    content,
    metadata: { productName: product.name, category: product.category },
  }];
}

export async function buildBakerKnowledgeDrafts(bakerId: number): Promise<ChunkDraft[]> {
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!baker) return [];

  const products = await db.select().from(productsTable).where(eq(productsTable.bakerId, bakerId));
  const drafts: ChunkDraft[] = [];

  drafts.push({
    sourceType: "baker_profile",
    sourceId: baker.id,
    chunkIndex: 0,
    content: [
      `Baker: ${baker.businessName}`,
      baker.tagline ? `Tagline: ${baker.tagline}` : "",
      baker.bio ? `About: ${baker.bio}` : "",
      `City: ${baker.city}`,
      baker.area ? `Area: ${baker.area}` : "",
      baker.deliveryAreas?.length ? `Delivery areas: ${baker.deliveryAreas.join(", ")}` : "",
    ].filter(Boolean).join("\n"),
    metadata: { businessName: baker.businessName },
  });

  drafts.push({
    sourceType: "policy",
    sourceId: baker.id,
    chunkIndex: 0,
    content: [
      `Payment policy: ${baker.codPolicy ?? "Cash on delivery (COD)."}`,
      baker.returnPolicy ? `Return policy: ${baker.returnPolicy}` : "",
      `Max orders per day: ${baker.maxOrdersPerDay}`,
      `WhatsApp: ${baker.whatsappNumber}`,
    ].filter(Boolean).join("\n"),
    metadata: { type: "policy" },
  });

  for (const product of products) {
    drafts.push(...productChunks(product));
  }

  return drafts;
}

export async function reindexBakerKnowledge(bakerId: number): Promise<{ chunks: number; provider: "openai" | "local" }> {
  const drafts = await buildBakerKnowledgeDrafts(bakerId);
  await db.delete(knowledgeChunksTable).where(eq(knowledgeChunksTable.bakerId, bakerId));

  if (drafts.length === 0) {
    return { chunks: 0, provider: "local" };
  }

  let provider: "openai" | "local" = "local";
  const rows = [];

  for (const draft of drafts) {
    const embedded = await embedText(draft.content);
    provider = embedded.provider;
    rows.push({
      bakerId,
      sourceType: draft.sourceType,
      sourceId: draft.sourceId ?? null,
      chunkIndex: draft.chunkIndex,
      content: draft.content,
      embedding: embedded.vector,
      metadata: draft.metadata ?? {},
      updatedAt: new Date(),
    });
  }

  await db.insert(knowledgeChunksTable).values(rows);
  return { chunks: rows.length, provider };
}
