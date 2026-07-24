/**
 * Adds customers, orders, and reviews for demo bakers without wiping existing data.
 * Safe to run on production when pitch data is missing.
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
import { pathToFileURL } from "node:url";

const DEMO_PASSWORDS: Record<string, string> = {
  "sana-sweet-studio": "SanaSweet2026!",
  "fatima-cakery": "FatimaCake2026!",
  "amna-bakes": "AmnaBakes2026!",
};

const DEMO_SLUGS = ["sana-sweet-studio", "fatima-cakery", "amna-bakes"] as const;

const PHONE_BASE: Record<string, string> = {
  "sana-sweet-studio": "+92300123",
  "fatima-cakery": "+92321876",
  "amna-bakes": "+92311555",
};

const AREAS: Record<string, string[]> = {
  "sana-sweet-studio": ["Gulberg", "Model Town", "DHA Phase 1", "Johar Town"],
  "fatima-cakery": ["Clifton", "Defence", "Bahadurabad", "Gulshan-e-Iqbal"],
  "amna-bakes": ["F-7", "F-8", "G-9", "Blue Area"],
};

const CHANNELS: Record<string, { wa: boolean; ig: boolean }> = {
  "sana-sweet-studio": { wa: true, ig: true },
  "fatima-cakery": { wa: true, ig: false },
  "amna-bakes": { wa: false, ig: false },
};

export async function enrichPitchData(): Promise<void> {
  for (const slug of DEMO_SLUGS) {
    const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.slug, slug)).limit(1);
    if (!baker) {
      console.log(`Skip ${slug}: baker not found`);
      continue;
    }

    const demoPassword = DEMO_PASSWORDS[slug];
    if (demoPassword) {
      await db
        .update(bakersTable)
        .set({ passwordHash: hashPassword(demoPassword) })
        .where(eq(bakersTable.id, baker.id));
    }

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

      console.log(`Enriching ${baker.businessName} (${count} orders → adding demo pack)`);
      await seedBakerDemoData({
        id: baker.id,
        businessName: baker.businessName,
        ownerName: baker.ownerName,
        city: baker.city,
        areas: AREAS[slug],
        products,
        phoneBase: PHONE_BASE[slug],
      });
    } else {
      console.log(`${baker.businessName}: already has ${count} orders`);
    }

    const [{ invCount }] = await db
      .select({ invCount: sql<number>`count(*)::int` })
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.bakerId, baker.id));

    if (invCount === 0) {
      const ch = CHANNELS[slug];
      console.log(`  Adding feature pack (Khata, notifications, chats…) for ${baker.businessName}`);
      await seedFullFeaturePack({
        id: baker.id,
        businessName: baker.businessName,
        ownerName: baker.ownerName,
        phoneBase: PHONE_BASE[slug],
        includeWhatsAppChats: ch.wa,
        includeInstagramChats: ch.ig,
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

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  enrichPitchData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Pitch enrich failed:", err);
      process.exit(1);
    });
}
