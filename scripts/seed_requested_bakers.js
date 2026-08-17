import { db } from "../lib/db/src/index.js";
import { bakersTable, productsTable, customersTable, ordersTable, reviewsTable } from "../lib/db/src/schema/index.js";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "../artifacts/api-server/src/lib/auth.js";
import { syncBakerStats } from "../artifacts/api-server/src/lib/seed-baker-demo.js";

const requestedBakers = [
  {
    email: "alisharubab5@gmail.com",
    slug: "alisha-bakery",
    businessName: "Alisha's Sweet Treats",
    ownerName: "Alisha Rubab",
    phone: "+923009991111",
    city: "Lahore",
    areas: ["Gulberg", "Model Town", "DHA Phase 3", "Johar Town"],
  },
  {
    email: "alexfrank3388@gmail.com",
    slug: "alex-delights",
    businessName: "Alex's Artisan Delights",
    ownerName: "Alex Frank",
    phone: "+923219992222",
    city: "Karachi",
    areas: ["Clifton", "DHA Phase 5", "Gulshan-e-Iqbal"],
  },
  {
    email: "hadiaakbarkhan911@gmail.com",
    slug: "hadia-bakes",
    businessName: "Hadia's Custom Bakes",
    ownerName: "Hadia Akbar",
    phone: "+923119993333",
    city: "Islamabad",
    areas: ["F-7", "F-8", "G-11", "DHA Phase 2"],
  }
];

const DEFAULT_PASSWORD = "BakerPassword2026!";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function deliveryDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

async function seedBaker(bakerData) {
  console.log(`Checking/creating baker: ${bakerData.email}...`);

  // Check if baker already exists
  let [baker] = await db.select().from(bakersTable).where(eq(bakersTable.email, bakerData.email)).limit(1);

  if (!baker) {
    const [inserted] = await db.insert(bakersTable).values({
      businessName: bakerData.businessName,
      ownerName: bakerData.ownerName,
      city: bakerData.city,
      whatsappNumber: bakerData.phone,
      email: bakerData.email,
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      slug: bakerData.slug,
      deliveryAreas: bakerData.areas,
      marketplaceVisible: true,
      subscriptionPlan: "pro",
    }).returning();
    baker = inserted;
    console.log(`Created baker account with ID: ${baker.id}`);
  } else {
    console.log(`Baker already exists with ID: ${baker.id}. Cleaning old seed data to prevent duplicates.`);
    await db.delete(ordersTable).where(eq(ordersTable.bakerId, baker.id));
    await db.delete(customersTable).where(eq(customersTable.bakerId, baker.id));
    await db.delete(reviewsTable).where(eq(reviewsTable.bakerId, baker.id));
  }

  // Ensure products exist
  let products = await db.select().from(productsTable).where(eq(productsTable.bakerId, baker.id)).limit(2);
  if (products.length === 0) {
    console.log("Creating default products...");
    products = await db.insert(productsTable).values([
      {
        bakerId: baker.id,
        name: "Chocolate Fudge Cake",
        description: "Rich, moist chocolate cake layers sandwiching velvety chocolate fudge frosting.",
        basePricePkr: 2500,
        category: "cakes",
        isAvailable: true,
        leadTimeDays: 1,
      },
      {
        bakerId: baker.id,
        name: "Red Velvet Cupcakes",
        description: "Classic red velvet cupcakes topped with a swirl of smooth cream cheese frosting.",
        basePricePkr: 1800,
        category: "cupcakes",
        isAvailable: true,
        leadTimeDays: 1,
      }
    ]).returning();
  }

  const p0 = products[0];
  const p1 = products[1] ?? p0;

  console.log("Seeding customer accounts...");
  const customerRows = [
    { bakerId: baker.id, name: "Ayesha Raza", whatsappNumber: `${bakerData.phone}11`, city: baker.city, preferredArea: bakerData.areas[0], totalOrders: 6, totalSpentPkr: 28600, lastOrderAt: daysAgo(4), isRegular: true, isAtRisk: false },
    { bakerId: baker.id, name: "Bilal Ahmad", whatsappNumber: `${bakerData.phone}22`, city: baker.city, preferredArea: bakerData.areas[1] ?? bakerData.areas[0], totalOrders: 2, totalSpentPkr: 9400, lastOrderAt: daysAgo(45), isRegular: false, isAtRisk: true },
    { bakerId: baker.id, name: "Hira Tariq", whatsappNumber: `${bakerData.phone}33`, city: baker.city, preferredArea: bakerData.areas[2] ?? bakerData.areas[0], totalOrders: 4, totalSpentPkr: 18200, lastOrderAt: daysAgo(8), isRegular: true, isAtRisk: false },
    { bakerId: baker.id, name: "Omar Siddiqui", whatsappNumber: `${bakerData.phone}44`, city: baker.city, preferredArea: bakerData.areas[3] ?? bakerData.areas[0], totalOrders: 1, totalSpentPkr: 3200, lastOrderAt: daysAgo(55), isRegular: false, isAtRisk: true },
    { bakerId: baker.id, name: "Zara Khan", whatsappNumber: `${bakerData.phone}55`, city: baker.city, preferredArea: bakerData.areas[0], totalOrders: 8, totalSpentPkr: 42300, lastOrderAt: daysAgo(2), isRegular: true, isAtRisk: false },
  ];

  const customers = await db.insert(customersTable).values(customerRows).returning();
  const [ayesha, bilal, hira, omar, zara] = customers;

  const item = (product, qty = 1) => ({
    productId: product.id,
    productName: product.name,
    sizeLabel: "Standard",
    quantity: qty,
    unitPricePkr: product.basePricePkr,
  });

  // Setup orderSpecs with a maximum age of 2 months (60 days)
  const orderSpecs = [
    { buyer: zara, area: bakerData.areas[0], items: [item(p0)], totalPkr: p0.basePricePkr, daysBack: 0, status: "new", paymentStatus: "pending", source: "marketplace", occasion: "Birthday" },
    { buyer: hira, area: bakerData.areas[1] ?? bakerData.areas[0], items: [item(p1)], totalPkr: p1.basePricePkr, daysBack: 1, status: "confirmed", paymentStatus: "pending", source: "baker_whatsapp", occasion: null },
    { buyer: ayesha, area: bakerData.areas[0], items: [item(p0), item(p1, 2)], totalPkr: p0.basePricePkr + p1.basePricePkr * 2, daysBack: 3, status: "in_production", paymentStatus: "pending", source: "instagram_dm", occasion: "Dawat" },
    { buyer: bilal, area: bakerData.areas[1] ?? bakerData.areas[0], items: [item(p0)], totalPkr: p0.basePricePkr, daysBack: 6, status: "delivered", paymentStatus: "paid", source: "marketplace", occasion: "Anniversary" },
    { buyer: zara, area: bakerData.areas[0], items: [item(p1)], totalPkr: p1.basePricePkr, daysBack: 10, status: "delivered", paymentStatus: "paid", source: "marketplace", occasion: "Eid" },
    { buyer: ayesha, area: bakerData.areas[0], items: [item(p0)], totalPkr: p0.basePricePkr, daysBack: 18, status: "delivered", paymentStatus: "paid", source: "baker_whatsapp", occasion: null },
    { buyer: hira, area: bakerData.areas[2] ?? bakerData.areas[0], items: [item(p1)], totalPkr: p1.basePricePkr, daysBack: 25, status: "delivered", paymentStatus: "paid", source: "instagram_dm", occasion: "Birthday" },
    { buyer: omar, area: bakerData.areas[3] ?? bakerData.areas[0], items: [item(p0)], totalPkr: p0.basePricePkr, daysBack: 35, status: "delivered", paymentStatus: "paid", source: "manual", occasion: null },
    { buyer: zara, area: bakerData.areas[0], items: [item(p0), item(p1)], totalPkr: p0.basePricePkr + p1.basePricePkr, daysBack: 48, status: "delivered", paymentStatus: "paid", source: "marketplace", occasion: "Party" },
    // Capped at 52 and 57 days instead of 62 and 75 to keep everything under 2 months
    { buyer: bilal, area: bakerData.areas[1] ?? bakerData.areas[0], items: [item(p1)], totalPkr: p1.basePricePkr, daysBack: 52, status: "delivered", paymentStatus: "paid", source: "baker_whatsapp", occasion: null },
    { buyer: ayesha, area: bakerData.areas[0], items: [item(p0)], totalPkr: p0.basePricePkr, daysBack: 57, status: "delivered", paymentStatus: "paid", source: "marketplace", occasion: "Eid" },
    { buyer: hira, area: bakerData.areas[2] ?? bakerData.areas[0], items: [item(p1)], totalPkr: p1.basePricePkr, daysBack: 12, status: "cancelled", paymentStatus: "pending", source: "marketplace", occasion: null, cancel: { reason: "Customer changed delivery date", by: "customer" } },
  ];

  console.log("Seeding order history (max 2 months)...");
  await db.insert(ordersTable).values(
    orderSpecs.map((spec) => ({
      bakerId: baker.id,
      buyerId: spec.buyer.id,
      buyerName: spec.buyer.name,
      buyerWhatsapp: spec.buyer.whatsappNumber,
      buyerAddress: `House demo, ${spec.area}, ${baker.city}`,
      buyerArea: spec.area,
      items: spec.items,
      totalPkr: spec.totalPkr,
      deliveryDate: deliveryDate(spec.daysBack > 5 ? -3 : 1),
      status: spec.status,
      paymentStatus: spec.paymentStatus,
      source: spec.source,
      occasion: spec.occasion,
      specialInstructions: null,
      cancellationReason: spec.cancel?.reason ?? null,
      cancelledBy: spec.cancel?.by ?? null,
      cancelledAt: spec.cancel ? daysAgo(spec.daysBack) : null,
      createdAt: daysAgo(spec.daysBack),
    })),
  );

  console.log("Seeding reviews...");
  await db.insert(reviewsTable).values([
    {
      bakerId: baker.id,
      buyerId: ayesha.id,
      buyerName: ayesha.name,
      rating: 5,
      ratingProduct: 5,
      ratingPackaging: 5,
      reviewText: `Loved the ${p0.name}! ${baker.ownerName} delivered on time and the packaging was beautiful.`,
      productName: p0.name,
    },
    {
      bakerId: baker.id,
      buyerId: zara.id,
      buyerName: zara.name,
      rating: 5,
      ratingProduct: 5,
      ratingPackaging: 4,
      reviewText: `${baker.businessName} is my go-to for celebrations. Highly recommend.`,
      productName: p1.name,
    },
    {
      bakerId: baker.id,
      buyerId: hira.id,
      buyerName: hira.name,
      rating: 4,
      ratingProduct: 5,
      ratingPackaging: 4,
      reviewText: "Fresh, delicious, and worth every rupee.",
      productName: p0.name,
    },
  ]);

  console.log("Syncing stats...");
  await syncBakerStats(baker.id);
  console.log(`Successfully completed seeding for ${bakerData.email}.\n`);
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL must be set before running the seed script.");
    process.exit(1);
  }
  for (const b of requestedBakers) {
    await seedBaker(b);
  }
  console.log("All requested bakers seeded successfully.");
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
