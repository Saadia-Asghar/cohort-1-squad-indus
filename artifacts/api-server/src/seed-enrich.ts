/**
 * Ensures demo bakers exist, then adds customers, orders, and reviews
 * without wiping existing data. Safe to run on production.
 *
 * Usage: DATABASE_URL=... pnpm --filter @workspace/api-server run seed:enrich
 */
import { db } from "@workspace/db";
import {
  bakersTable,
  inventoryItemsTable,
  ordersTable,
  productsTable,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { seedBakerDemoData, syncBakerStats } from "./lib/seed-baker-demo.js";
import { seedFullFeaturePack } from "./lib/seed-feature-packs.js";
import { reindexBakerKnowledge } from "./lib/rag/indexer.js";
import { hashPassword } from "./lib/auth.js";
import {
  DEMO_BAKER_PROFILES,
  DEMO_PASSWORDS,
  DEMO_SLUGS,
  type DemoProductSeed,
  type DemoSlug,
} from "./lib/demo-bakers.js";

export { DEMO_BAKER_PROFILES, DEMO_PASSWORDS, DEMO_SLUGS };
export type { DemoSlug };

async function ensureStarterProducts(bakerId: number, products: DemoProductSeed[]): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.bakerId, bakerId));
  if (count > 0) return;

  await db.insert(productsTable).values(
    products.map((product) => ({
      bakerId,
      name: product.name,
      description: product.description,
      basePricePkr: product.basePricePkr,
      recipeCostPkr: product.recipeCostPkr,
      sizes: product.sizes,
      variants: [],
      isEgglessAvailable: product.isEgglessAvailable,
      isAvailable: true,
      leadTimeDays: product.leadTimeDays,
      category: product.category,
      occasionTags: product.occasionTags,
      dietaryTags: product.dietaryTags,
      ingredients: product.ingredients,
      allergens: product.allergens,
      photoUrl: product.photoUrl,
      isBestSeller: product.isBestSeller,
      isTopRated: product.isTopRated,
      displayOrder: product.displayOrder,
    })),
  );
}

export async function ensureDemoBaker(slug: DemoSlug) {
  const profile = DEMO_BAKER_PROFILES[slug];
  const passwordHash = hashPassword(DEMO_PASSWORDS[slug]);
  const [existing] = await db.select().from(bakersTable).where(eq(bakersTable.slug, slug)).limit(1);

  if (existing) {
    await db
      .update(bakersTable)
      .set({
        passwordHash,
        marketplaceVisible: true,
        email: profile.email,
        businessName: profile.businessName,
        ownerName: profile.ownerName,
      })
      .where(eq(bakersTable.id, existing.id));
    await ensureStarterProducts(existing.id, profile.products);
    console.log(`Demo baker ready: ${profile.businessName} (#${existing.id})`);
    return existing;
  }

  try {
    const [created] = await db
      .insert(bakersTable)
      .values({
        businessName: profile.businessName,
        ownerName: profile.ownerName,
        tagline: profile.tagline,
        bio: profile.bio,
        city: profile.city,
        area: profile.area,
        whatsappNumber: profile.whatsappNumber,
        email: profile.email,
        passwordHash,
        deliveryAreas: profile.deliveryAreas,
        marketplaceVisible: true,
        subscriptionPlan: profile.subscriptionPlan,
        agentActive: profile.agentActive,
        whatsappAgentEnabled: profile.whatsappAgentEnabled,
        instagramAgentEnabled: profile.instagramAgentEnabled,
        trialEndsAt: profile.trialDays ? new Date(Date.now() + profile.trialDays * 86400000) : null,
        slug,
        photoUrl: profile.photoUrl,
        agentConfig: {
          customGreeting: profile.greeting,
          autoReplyEnabled: profile.agentActive,
          allowPickup: true,
          allowDelivery: true,
        },
      })
      .returning();

    await ensureStarterProducts(created.id, profile.products);
    console.log(`Created demo baker: ${profile.businessName} (#${created.id})`);
    return created;
  } catch (error) {
    const [byEmail] = await db.select().from(bakersTable).where(eq(bakersTable.email, profile.email)).limit(1);
    if (!byEmail) throw error;
    await db
      .update(bakersTable)
      .set({ passwordHash, marketplaceVisible: true, slug, businessName: profile.businessName, ownerName: profile.ownerName })
      .where(eq(bakersTable.id, byEmail.id));
    await ensureStarterProducts(byEmail.id, profile.products);
    console.log(`Reused existing baker email for demo: ${profile.businessName} (#${byEmail.id})`);
    return byEmail;
  }
}

export async function enrichPitchData(): Promise<void> {
  for (const slug of DEMO_SLUGS) {
    const baker = await ensureDemoBaker(slug);
    const profile = DEMO_BAKER_PROFILES[slug];

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(eq(ordersTable.bakerId, baker.id));

    if (count < 8) {
      const products = await db
        .select({ id: productsTable.id, name: productsTable.name, basePricePkr: productsTable.basePricePkr })
        .from(productsTable)
        .where(eq(productsTable.bakerId, baker.id))
        .limit(2);

      if (products.length === 0) {
        console.log(`Skip ${baker.businessName}: no products`);
        continue;
      }

      console.log(`Enriching ${baker.businessName} (${count} orders â†’ adding demo pack)`);
      await seedBakerDemoData({
        id: baker.id,
        businessName: baker.businessName,
        ownerName: baker.ownerName,
        city: baker.city,
        areas: profile.deliveryAreas,
        products,
        phoneBase: profile.phoneBase,
      });
    } else {
      console.log(`${baker.businessName}: already has ${count} orders`);
    }

    const [{ invCount }] = await db
      .select({ invCount: sql<number>`count(*)::int` })
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.bakerId, baker.id));

    if (invCount === 0) {
      console.log(`  Adding feature pack (Khata, notifications, chatsâ€¦) for ${baker.businessName}`);
      await seedFullFeaturePack({
        id: baker.id,
        businessName: baker.businessName,
        ownerName: baker.ownerName,
        phoneBase: profile.phoneBase,
        includeWhatsAppChats: profile.channels.wa,
        includeInstagramChats: profile.channels.ig,
      });
    } else {
      console.log(`  Feature pack already present (${invCount} inventory rows)`);
    }

    const indexed = await reindexBakerKnowledge(baker.id);
    console.log(`  RAG: ${indexed.chunks} chunks`);
    await syncBakerStats(baker.id);
  }

  console.log("Pitch enrich complete.");
}

const isDirectRun = /(?:^|[\\/])seed-enrich\.(?:ts|js|mjs)$/.test(process.argv[1] ?? "");

if (isDirectRun) {
  enrichPitchData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Pitch enrich failed:", err);
      process.exit(1);
    });
}
