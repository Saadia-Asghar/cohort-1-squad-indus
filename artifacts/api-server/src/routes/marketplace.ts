import { Router } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, bakersTable, productsTable } from "@workspace/db";

const router = Router();

// GET /marketplace/featured
router.get("/marketplace/featured", async (req, res): Promise<void> => {
  const { city, area } = req.query as Record<string, string>;
  let query = db.select().from(bakersTable).where(eq(bakersTable.marketplaceVisible, true)).$dynamic();
  if (city) query = query.where(eq(bakersTable.city, city));
  const bakers = await query.limit(12);
  const bakerCards = await Promise.all(
    bakers.map(async (b) => {
      const products = await db.select({ category: productsTable.category, basePricePkr: productsTable.basePricePkr })
        .from(productsTable).where(eq(productsTable.bakerId, b.id));
      const categories = [...new Set(products.map((p) => p.category))];
      const startingPrice = products.length > 0 ? Math.min(...products.map((p) => p.basePricePkr)) : null;
      return { ...b, deliveryAreas: b.deliveryAreas ?? [], categories, startingPrice };
    })
  );
  res.json(bakerCards);
});

// GET /marketplace/search
router.get("/marketplace/search", async (req, res): Promise<void> => {
  const { q, city, area, category, occasion, dietary } = req.query as Record<string, string>;
  const bakers = await db.select().from(bakersTable).where(eq(bakersTable.marketplaceVisible, true)).limit(20);
  const bakerCards = await Promise.all(
    bakers
      .filter((b) => {
        if (city && b.city !== city) return false;
        if (q && !b.businessName.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      })
      .map(async (b) => {
        const products = await db.select({ category: productsTable.category, basePricePkr: productsTable.basePricePkr })
          .from(productsTable).where(eq(productsTable.bakerId, b.id));
        const categories = [...new Set(products.map((p) => p.category))];
        const startingPrice = products.length > 0 ? Math.min(...products.map((p) => p.basePricePkr)) : null;
        return { ...b, deliveryAreas: b.deliveryAreas ?? [], categories, startingPrice };
      })
  );
  // Search products
  let productQuery = db.select().from(productsTable).where(eq(productsTable.isAvailable, true)).$dynamic();
  if (category) productQuery = productQuery.where(eq(productsTable.category, category));
  const products = await productQuery.limit(20);
  const filteredProducts = products
    .filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    })
    .map((p) => ({
      ...p,
      sizes: (p.sizes as unknown[]) ?? [],
      variants: p.variants ?? [],
      occasionTags: p.occasionTags ?? [],
      dietaryTags: p.dietaryTags ?? [],
    }));
  res.json({ bakers: bakerCards, products: filteredProducts });
});

// GET /marketplace/categories
router.get("/marketplace/categories", async (req, res): Promise<void> => {
  const products = await db.select({ category: productsTable.category }).from(productsTable);
  const counts: Record<string, number> = {};
  for (const p of products) {
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  }
  const categories = Object.entries(counts).map(([name, count]) => ({ name, count, icon: null }));
  res.json(categories);
});

export default router;
