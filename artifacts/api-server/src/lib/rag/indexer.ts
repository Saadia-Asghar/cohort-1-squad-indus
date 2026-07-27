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

  const leadParts: string[] = [];
  if (product.leadTimeDays > 0) leadParts.push(`${product.leadTimeDays} day(s)`);
  if (product.leadTimeHours && product.leadTimeHours > 0) leadParts.push(`${product.leadTimeHours} hour(s)`);
  const leadText = leadParts.length ? `Ready in: ${leadParts.join(" + ")}.` : "";

  const fulfillment: string[] = [];
  if (product.pickupAvailable !== false) fulfillment.push("pickup from bakery");
  if (product.deliveryAvailable !== false) fulfillment.push("home delivery");

  const content = [
    `Product: ${product.name}`,
    product.description ? `Description: ${product.description}` : "",
    `Category: ${product.category}`,
    `Pricing: ${sizeText}`,
    product.isEgglessAvailable ? "Eggless version available." : "",
    leadText,
    fulfillment.length ? `Fulfillment: ${fulfillment.join(" or ")}.` : "",
    product.ingredients?.length ? `Ingredients: ${product.ingredients.join(", ")}.` : "",
    product.allergens?.length ? `Allergens: ${product.allergens.join(", ")}.` : "",
    product.dietaryTags?.length ? `Dietary labels: ${product.dietaryTags.join(", ")}` : "",
    product.suggestionTags?.length ? `Good for: ${product.suggestionTags.join(", ")}` : "",
    product.occasionTags?.length ? `Occasions: ${product.occasionTags.join(", ")}` : "",
    product.isAvailable ? "Status: available to order." : "Status: currently unavailable — do not accept new orders for this item.",
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

  const config = (baker.agentConfig ?? {}) as Record<string, unknown>;
  drafts.push({
    sourceType: "policy",
    sourceId: baker.id,
    chunkIndex: 0,
    content: [
      `Payment policy: ${baker.codPolicy ?? "Cash on delivery (COD)."}`,
      baker.returnPolicy ? `Return policy: ${baker.returnPolicy}` : "",
      `Max orders per day: ${baker.maxOrdersPerDay}`,
      config.cancellationPolicy
        ? `Cancellation policy: ${config.cancellationPolicy}`
        : config.cancellationAllowed === false
          ? "Orders cannot be cancelled once confirmed."
          : config.cancellationHoursBefore
            ? `Orders may be cancelled up to ${config.cancellationHoursBefore} hours before delivery.`
            : "",
      config.pickupAddress ? `Pickup address: ${config.pickupAddress}` : "",
      config.allowPickup === false ? "Pickup not available." : "Pickup available.",
      config.allowDelivery === false ? "Home delivery not available." : "Home delivery available where listed.",
      typeof config.deliveryPricing === "string" && config.deliveryPricing.trim()
        ? `Delivery pricing: ${config.deliveryPricing.trim()}`
        : "",
      config.availabilityHours ? `Kitchen hours: ${config.availabilityHours}` : "",
      config.dietaryPolicy ? `Dietary policy: ${config.dietaryPolicy}` : "",
      config.activeOffers ? `Current offers: ${config.activeOffers}` : "",
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
