import { db } from "@workspace/db";
import {
  bakersTable,
  productsTable,
  ordersTable,
  reviewsTable,
  customersTable,
  bakerGoalsTable,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { reindexBakerKnowledge } from "./lib/rag/indexer.js";
import { hashPassword } from "./lib/auth.js";
import { seedBakerDemoData, syncBakerStats } from "./lib/seed-baker-demo.js";
import { seedFullFeaturePack } from "./lib/seed-feature-packs.js";

async function seed() {
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  if (isProd && process.env.ALLOW_DESTRUCTIVE_SEED !== "1") {
    console.error(
      "Refusing destructive seed in production. Set ALLOW_DESTRUCTIVE_SEED=1 only if you intentionally wipe the database.",
    );
    process.exit(1);
  }

  console.log("Seeding Sweet Tooth database...");

  // Clear all tables (includes Khata, notifications, memory used by every dashboard tab)
  await db.execute(sql`
    TRUNCATE
      sweet_tooth.baker_reminders,
      sweet_tooth.baker_notes,
      sweet_tooth.baker_goals,
      sweet_tooth.knowledge_chunks,
      sweet_tooth.conversation_memory,
      sweet_tooth.notifications,
      sweet_tooth.inventory_items,
      sweet_tooth.ledger_entries,
      sweet_tooth.chat_messages,
      sweet_tooth.cart_items,
      sweet_tooth.reviews,
      sweet_tooth.customers,
      sweet_tooth.orders,
      sweet_tooth.products,
      sweet_tooth.bakers
    RESTART IDENTITY CASCADE
  `);

  // --- Bakers (differentiated plans/channels so every Agent Hub + Settings path is testable) ---
  const [sana] = await db.insert(bakersTable).values({
    businessName: "Sana's Sweet Studio",
    ownerName: "Sana Malik",
    tagline: "Ghar ka meetha, dil se banaya",
    bio: "Home baker from Gulberg, Lahore. Specialising in custom cakes, cupcakes, and Pakistani mithai-inspired fusion desserts. Every order is made with love and the finest ingredients.",
    city: "Lahore",
    area: "Gulberg",
    whatsappNumber: "+923001234567",
    email: "sana@studio.com",
    passwordHash: hashPassword("SanaSweet2026!"),
    deliveryAreas: ["Gulberg", "Model Town", "DHA Phase 1", "DHA Phase 2", "Johar Town"],
    codPolicy: "50% advance above PKR 5,000. COD available for smaller orders.",
    returnPolicy: "Quality issue? Contact me within 2 hours of delivery. I'll make it right.",
    requireAdvance: true,
    advanceThresholdPkr: 5000,
    advancePercentage: 50,
    paymentDetails: "JazzCash 0300-1234567 (Sana Malik) · EasyPaisa same number",
    maxOrdersPerDay: 8,
    agentActive: true,
    whatsappAgentEnabled: true,
    instagramAgentEnabled: true,
    marketplaceVisible: true,
    subscriptionPlan: "bakery_plus",
    agentConfig: {
      customGreeting: "Assalam-o-Alaikum! Sana's Sweet Studio — cakes, cupcakes aur fusion mithai. Kya chahiye?",
      autoReplyEnabled: true,
      agentLanguage: "bilingual",
      preferredCustomerChannel: "whatsapp",
      paymentMode: "partial_advance",
      occasionPreset: "eid_fitr",
      occasionOrderDeadline: "2026-03-28",
      occasionFreshDays: 2,
      occasionNote: "Eid boxes need 48h notice. Flavours freeze after deadline.",
      allowPickup: true,
      allowDelivery: true,
      pickupAddress: "Gulberg III, Lahore (share exact pin on WhatsApp)",
      availabilityHours: "Tue–Sun 11am–8pm",
      dietaryPolicy: "Eggless on request for cakes. Kitchen handles nuts — tell us allergies.",
      activeOffers: "Eid special: 10% off boxes booked before deadline",
      socialLinks: { instagram: "https://instagram.com/sanasweetstudio" },
      escalateKeywords: ["baker", "custom design", "speak to sana"],
    } as never,
    ratingAvg: 4.9,
    totalOrders: 247,
    slug: "sana-sweet-studio",
    photoUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop",
  }).returning();

  const [fatima] = await db.insert(bakersTable).values({
    businessName: "Fatima's Cakery",
    ownerName: "Fatima Zahra",
    tagline: "Every bite tells a story",
    bio: "Premium custom cakes for your most special moments. Based in Karachi's Clifton, delivering across Defence and Clifton.",
    city: "Karachi",
    area: "Clifton",
    whatsappNumber: "+923219876543",
    email: "fatima@cakery.com",
    passwordHash: hashPassword("FatimaCake2026!"),
    deliveryAreas: ["Clifton", "Defence", "Bahadurabad", "Gulshan-e-Iqbal"],
    codPolicy: "Custom cakes require 30% advance. Balance on delivery.",
    returnPolicy: "Freshness guaranteed. Report issues within 1 hour of delivery.",
    requireAdvance: true,
    advanceThresholdPkr: 3000,
    advancePercentage: 30,
    paymentDetails: "Bank transfer: Meezan 0123-45678901 (Fatima Zahra)",
    maxOrdersPerDay: 6,
    agentActive: true,
    whatsappAgentEnabled: true,
    instagramAgentEnabled: false,
    marketplaceVisible: true,
    subscriptionPlan: "starter",
    agentConfig: {
      customGreeting: "Welcome to Fatima's Cakery — wedding & celebration cakes in Clifton.",
      autoReplyEnabled: true,
      agentLanguage: "english",
      preferredCustomerChannel: "whatsapp",
      paymentMode: "partial_advance",
      occasionPreset: "normal",
      allowPickup: true,
      allowDelivery: true,
      pickupAddress: "Clifton Block 5, Karachi",
      availabilityHours: "Mon–Sat 10am–7pm",
      dietaryPolicy: "Eggless wedding tiers available with notice.",
      socialLinks: { instagram: "https://instagram.com/fatimascakery" },
    } as never,
    ratingAvg: 4.8,
    totalOrders: 189,
    slug: "fatima-cakery",
    photoUrl: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&auto=format&fit=crop",
  }).returning();

  const [amna] = await db.insert(bakersTable).values({
    businessName: "Amna Bakes",
    ownerName: "Amna Sheikh",
    tagline: "Simple ingredients, extraordinary taste",
    bio: "Home baker specialising in brownies, cookies, and classic Pakistani sweets. Available in F-7 and F-8, Islamabad.",
    city: "Islamabad",
    area: "F-7",
    whatsappNumber: "+923115554321",
    email: "amna@bakes.com",
    passwordHash: hashPassword("AmnaBakes2026!"),
    deliveryAreas: ["F-7", "F-8", "G-9", "G-11", "Blue Area"],
    codPolicy: "Cash on delivery for all orders.",
    returnPolicy: "Quality guarantee on all products.",
    requireAdvance: false,
    advanceThresholdPkr: 2000,
    advancePercentage: 0,
    paymentDetails: "COD only — no advance required",
    maxOrdersPerDay: 10,
    agentActive: false,
    whatsappAgentEnabled: false,
    instagramAgentEnabled: false,
    marketplaceVisible: true,
    subscriptionPlan: "free",
    trialEndsAt: new Date(Date.now() + 3 * 86400000),
    agentConfig: {
      customGreeting: "Hi! Browse Amna Bakes menu — cookies, banana bread, and more.",
      autoReplyEnabled: false,
      agentLanguage: "english",
      preferredCustomerChannel: "web",
      paymentMode: "cod",
      occasionPreset: "normal",
      allowPickup: true,
      allowDelivery: true,
      pickupAddress: "F-7 Markaz, Islamabad",
      availabilityHours: "Fri–Sun 12pm–6pm",
      dietaryPolicy: "Eggless banana bread always available.",
    } as never,
    ratingAvg: 4.7,
    totalOrders: 94,
    slug: "amna-bakes",
    photoUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop",
  }).returning();

  console.log("Bakers seeded:", sana.id, fatima.id, amna.id);

  // --- Products for Sana ---
  const sanaProducts = await db.insert(productsTable).values([
    {
      bakerId: sana.id,
      name: "Classic Black Forest Cake",
      description: "Layers of moist chocolate sponge, fresh cream, and cherries. A timeless favourite.",
      basePricePkr: 2800,
      recipeCostPkr: 950,
      sizes: [
        { label: "Half Kg", pricePkr: 2800 },
        { label: "1 Kg", pricePkr: 5200 },
        { label: "2 Kg", pricePkr: 9800 },
      ],
      variants: [],
      isEgglessAvailable: true,
      isAvailable: true,
      leadTimeDays: 1,
      category: "Cakes",
      occasionTags: ["Birthday", "Anniversary", "Eid"],
      dietaryTags: [],
      ingredients: ["chocolate sponge", "fresh cream", "cherries", "cocoa"],
      allergens: ["dairy", "gluten", "eggs"],
      photoUrl: "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=600&auto=format&fit=crop",
      totalOrders: 89,
      isBestSeller: true,
      isTopRated: true,
      displayOrder: 1,
    },
    {
      bakerId: sana.id,
      name: "Red Velvet Cupcakes",
      description: "Velvety, soft cupcakes with cream cheese frosting. Box of 6 or 12.",
      basePricePkr: 1200,
      recipeCostPkr: 380,
      sizes: [
        { label: "Box of 6", pricePkr: 1200 },
        { label: "Box of 12", pricePkr: 2200 },
      ],
      variants: [],
      isEgglessAvailable: false,
      isAvailable: true,
      leadTimeDays: 1,
      category: "Cupcakes",
      occasionTags: ["Birthday", "Valentine's Day", "Party"],
      dietaryTags: [],
      photoUrl: "https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=600&auto=format&fit=crop",
      totalOrders: 134,
      isBestSeller: true,
      isTopRated: false,
      displayOrder: 2,
    },
    {
      bakerId: sana.id,
      name: "Gulab Jamun Cheesecake",
      description: "A fusion masterpiece — classic NY cheesecake topped with homemade gulab jamun in rose syrup.",
      basePricePkr: 3500,
      recipeCostPkr: 1200,
      sizes: [
        { label: "Half Kg", pricePkr: 3500 },
        { label: "1 Kg", pricePkr: 6500 },
      ],
      variants: [],
      isEgglessAvailable: false,
      isAvailable: true,
      leadTimeDays: 2,
      category: "Cheesecakes",
      occasionTags: ["Eid", "Dawat", "Special Occasion"],
      dietaryTags: ["Eggless available on request"],
      ingredients: ["cream cheese", "gulab jamun", "rose syrup"],
      allergens: ["dairy", "gluten"],
      photoUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop",
      totalOrders: 56,
      isBestSeller: false,
      isTopRated: true,
      displayOrder: 3,
    },
    {
      bakerId: sana.id,
      name: "Fudgy Brownies",
      description: "Dense, rich, extra-fudgy chocolate brownies. Made with Belgian dark chocolate.",
      basePricePkr: 900,
      recipeCostPkr: 280,
      sizes: [
        { label: "Box of 6", pricePkr: 900 },
        { label: "Box of 12", pricePkr: 1700 },
      ],
      variants: ["Plain", "Nutella Swirl", "Walnut"],
      isEgglessAvailable: false,
      isAvailable: true,
      leadTimeDays: 1,
      category: "Brownies",
      occasionTags: ["Casual", "Gift", "Corporate"],
      dietaryTags: [],
      photoUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop",
      totalOrders: 203,
      isBestSeller: true,
      isTopRated: false,
      displayOrder: 4,
    },
    {
      bakerId: sana.id,
      name: "Mango Tres Leches",
      description: "Light sponge soaked in three milks, topped with fresh mango cream. Summer special.",
      basePricePkr: 3200,
      sizes: [
        { label: "Half Kg", pricePkr: 3200 },
        { label: "1 Kg", pricePkr: 5800 },
      ],
      variants: [],
      isEgglessAvailable: false,
      isAvailable: true,
      leadTimeDays: 1,
      category: "Cakes",
      occasionTags: ["Birthday", "Casual", "Summer"],
      dietaryTags: [],
      photoUrl: "https://images.unsplash.com/photo-1567206563114-c179d37ecbc3?w=600&auto=format&fit=crop",
      totalOrders: 41,
      isBestSeller: false,
      isTopRated: false,
      displayOrder: 5,
    },
    {
      bakerId: sana.id,
      name: "Chocolate Truffles Box",
      description: "Handcrafted dark and milk chocolate truffles with various fillings. Perfect gifting.",
      basePricePkr: 1800,
      sizes: [
        { label: "Box of 12", pricePkr: 1800 },
        { label: "Box of 24", pricePkr: 3400 },
      ],
      variants: ["Assorted", "All Dark Chocolate", "All Milk Chocolate"],
      isEgglessAvailable: true,
      isAvailable: false,
      leadTimeDays: 2,
      category: "Chocolates",
      occasionTags: ["Valentine's Day", "Anniversary", "Gift", "Corporate"],
      dietaryTags: [],
      photoUrl: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=600&auto=format&fit=crop",
      totalOrders: 67,
      isBestSeller: false,
      isTopRated: false,
      displayOrder: 6,
    },
  ]).returning();

  // --- Products for Fatima ---
  const fatimaProducts = await db.insert(productsTable).values([
    {
      bakerId: fatima.id,
      name: "Fondant Wedding Cake",
      description: "Elegant multi-tier custom wedding cakes with hand-crafted sugar flowers.",
      basePricePkr: 15000,
      recipeCostPkr: 6200,
      sizes: [
        { label: "2 Tier (2 Kg)", pricePkr: 15000 },
        { label: "3 Tier (4 Kg)", pricePkr: 28000 },
        { label: "4 Tier (6 Kg)", pricePkr: 42000 },
      ],
      variants: [],
      isEgglessAvailable: true,
      isAvailable: true,
      leadTimeDays: 7,
      category: "Wedding Cakes",
      occasionTags: ["Wedding", "Nikah", "Engagement"],
      dietaryTags: [],
      ingredients: ["vanilla sponge", "fondant", "sugar flowers"],
      allergens: ["dairy", "gluten", "eggs"],
      photoUrl: "https://images.unsplash.com/photo-1549298651-0e5b3a0e9ca3?w=600&auto=format&fit=crop",
      totalOrders: 34,
      isBestSeller: true,
      isTopRated: true,
      displayOrder: 1,
    },
    {
      bakerId: fatima.id,
      name: "Strawberry Shortcake",
      description: "Light vanilla sponge with fresh strawberries and whipped cream. Simple and beautiful.",
      basePricePkr: 2500,
      recipeCostPkr: 780,
      sizes: [
        { label: "Half Kg", pricePkr: 2500 },
        { label: "1 Kg", pricePkr: 4500 },
      ],
      variants: [],
      isEgglessAvailable: false,
      isAvailable: true,
      leadTimeDays: 1,
      category: "Cakes",
      occasionTags: ["Birthday", "Casual"],
      dietaryTags: [],
      photoUrl: "https://images.unsplash.com/photo-1488477304112-4944851de03d?w=600&auto=format&fit=crop",
      totalOrders: 78,
      isBestSeller: true,
      isTopRated: false,
      displayOrder: 2,
    },
  ]).returning();

  const amnaProducts = await db.insert(productsTable).values([
    {
      bakerId: amna.id,
      name: "Chocolate Chip Cookies",
      description: "Classic American-style chocolate chip cookies. Crispy edges, chewy centre.",
      basePricePkr: 700,
      recipeCostPkr: 220,
      sizes: [
        { label: "Box of 12", pricePkr: 700 },
        { label: "Box of 24", pricePkr: 1300 },
      ],
      variants: [],
      isEgglessAvailable: false,
      isAvailable: true,
      leadTimeDays: 1,
      category: "Cookies",
      occasionTags: ["Casual", "Gift", "School"],
      dietaryTags: [],
      ingredients: ["flour", "butter", "chocolate chips"],
      allergens: ["gluten", "dairy", "eggs"],
      photoUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop",
      totalOrders: 156,
      isBestSeller: true,
      isTopRated: true,
      displayOrder: 1,
    },
    {
      bakerId: amna.id,
      name: "Eggless Banana Bread",
      description: "Moist, rich banana bread — fully eggless. A family favourite.",
      basePricePkr: 850,
      recipeCostPkr: 260,
      sizes: [{ label: "Loaf (500g)", pricePkr: 850 }],
      variants: [],
      isEgglessAvailable: true,
      isAvailable: true,
      leadTimeDays: 1,
      category: "Breads",
      occasionTags: ["Casual", "Breakfast"],
      dietaryTags: ["Eggless", "Vegetarian"],
      photoUrl: "https://images.unsplash.com/photo-1585478259715-1c195ae2b568?w=600&auto=format&fit=crop",
      totalOrders: 89,
      isBestSeller: false,
      isTopRated: true,
      displayOrder: 2,
    },
  ]).returning();

  console.log("Products seeded");

  // --- Customers for Sana ---
  const today = new Date();
  const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };

  const [ayesha, bilal, hira, omar, zara] = await db.insert(customersTable).values([
    {
      bakerId: sana.id,
      name: "Ayesha Raza",
      whatsappNumber: "+923001111111",
      city: "Lahore",
      preferredArea: "Gulberg",
      totalOrders: 12,
      totalSpentPkr: 48600,
      lastOrderAt: daysAgo(3),
      isRegular: true,
      isAtRisk: false,
    },
    {
      bakerId: sana.id,
      name: "Bilal Ahmad",
      whatsappNumber: "+923002222222",
      city: "Lahore",
      preferredArea: "DHA Phase 1",
      totalOrders: 5,
      totalSpentPkr: 18400,
      lastOrderAt: daysAgo(50),
      isRegular: false,
      isAtRisk: true,
    },
    {
      bakerId: sana.id,
      name: "Hira Tariq",
      whatsappNumber: "+923003333333",
      city: "Lahore",
      preferredArea: "Model Town",
      totalOrders: 8,
      totalSpentPkr: 34200,
      lastOrderAt: daysAgo(7),
      isRegular: true,
      isAtRisk: false,
    },
    {
      bakerId: sana.id,
      name: "Omar Siddiqui",
      whatsappNumber: "+923004444444",
      city: "Lahore",
      preferredArea: "Johar Town",
      totalOrders: 2,
      totalSpentPkr: 7600,
      lastOrderAt: daysAgo(60),
      isRegular: false,
      isAtRisk: true,
    },
    {
      bakerId: sana.id,
      name: "Zara Khan",
      whatsappNumber: "+923005555555",
      city: "Lahore",
      preferredArea: "DHA Phase 2",
      totalOrders: 15,
      totalSpentPkr: 62300,
      lastOrderAt: daysAgo(1),
      isRegular: true,
      isAtRisk: false,
    },
  ]).returning();

  console.log("Customers seeded");

  // --- Orders for Sana ---
  const orderItems1 = [{ productId: sanaProducts[0].id, productName: "Classic Black Forest Cake", sizeLabel: "1 Kg", quantity: 1, unitPricePkr: 5200 }];
  const orderItems2 = [{ productId: sanaProducts[1].id, productName: "Red Velvet Cupcakes", sizeLabel: "Box of 12", quantity: 1, unitPricePkr: 2200 }];
  const orderItems3 = [
    { productId: sanaProducts[3].id, productName: "Fudgy Brownies", sizeLabel: "Box of 6", quantity: 2, unitPricePkr: 900 },
    { productId: sanaProducts[2].id, productName: "Gulab Jamun Cheesecake", sizeLabel: "Half Kg", quantity: 1, unitPricePkr: 3500 },
  ];
  const orderItems4 = [{ productId: sanaProducts[0].id, productName: "Classic Black Forest Cake", sizeLabel: "Half Kg", quantity: 1, unitPricePkr: 2800 }];
  const orderItems5 = [{ productId: sanaProducts[4].id, productName: "Mango Tres Leches", sizeLabel: "1 Kg", quantity: 1, unitPricePkr: 5800 }];

  const makeDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().slice(0, 10);
  };

  await db.insert(ordersTable).values([
    {
      bakerId: sana.id,
      buyerId: ayesha.id,
      buyerName: "Ayesha Raza",
      buyerWhatsapp: "+923001111111",
      buyerAddress: "House 45, Block C, Gulberg III, Lahore",
      buyerArea: "Gulberg",
      items: orderItems1,
      totalPkr: 5200,
      deliveryDate: makeDate(1),
      status: "new",
      paymentStatus: "pending",
      source: "marketplace",
      occasion: "Birthday",
      specialInstructions: "Please write 'Happy Birthday Mama' on the cake",
      createdAt: daysAgo(0),
    },
    {
      bakerId: sana.id,
      buyerId: hira.id,
      buyerName: "Hira Tariq",
      buyerWhatsapp: "+923003333333",
      buyerAddress: "32-A, Model Town Extension, Lahore",
      buyerArea: "Model Town",
      items: orderItems2,
      totalPkr: 2200,
      deliveryDate: makeDate(0),
      status: "confirmed",
      paymentStatus: "pending",
      source: "baker_whatsapp",
      occasion: null,
      specialInstructions: null,
      createdAt: daysAgo(1),
    },
    {
      bakerId: sana.id,
      buyerId: zara.id,
      buyerName: "Zara Khan",
      buyerWhatsapp: "+923005555555",
      buyerAddress: "Flat 8, Pearl Residency, DHA Phase 2, Lahore",
      buyerArea: "DHA Phase 2",
      items: orderItems3,
      totalPkr: 5300,
      deliveryDate: makeDate(0),
      status: "in_production",
      paymentStatus: "pending",
      source: "instagram_dm",
      occasion: "Dawat",
      specialInstructions: "Extra fudgy please",
      createdAt: daysAgo(2),
    },
    {
      bakerId: sana.id,
      buyerId: bilal.id,
      buyerName: "Bilal Ahmad",
      buyerWhatsapp: "+923002222222",
      buyerAddress: "10, Street 5, DHA Phase 1, Lahore",
      buyerArea: "DHA Phase 1",
      items: orderItems4,
      totalPkr: 2800,
      deliveryDate: makeDate(-3),
      status: "delivered",
      paymentStatus: "pending",
      source: "marketplace",
      occasion: "Anniversary",
      specialInstructions: null,
      createdAt: daysAgo(5),
    },
    {
      bakerId: sana.id,
      buyerId: zara.id,
      buyerName: "Zara Khan",
      buyerWhatsapp: "+923005555555",
      buyerAddress: "Flat 8, Pearl Residency, DHA Phase 2, Lahore",
      buyerArea: "DHA Phase 2",
      items: orderItems5,
      totalPkr: 5800,
      deliveryDate: makeDate(-7),
      status: "delivered",
      paymentStatus: "paid",
      source: "marketplace",
      occasion: "Birthday",
      specialInstructions: null,
      createdAt: daysAgo(9),
    },
    {
      bakerId: sana.id,
      buyerId: ayesha.id,
      buyerName: "Ayesha Raza",
      buyerWhatsapp: "+923001111111",
      buyerAddress: "House 45, Block C, Gulberg III, Lahore",
      buyerArea: "Gulberg",
      items: orderItems2,
      totalPkr: 2200,
      deliveryDate: makeDate(-12),
      status: "delivered",
      paymentStatus: "paid",
      source: "baker_whatsapp",
      occasion: null,
      specialInstructions: null,
      createdAt: daysAgo(14),
    },
    {
      bakerId: sana.id,
      buyerId: hira.id,
      buyerName: "Hira Tariq",
      buyerWhatsapp: "+923003333333",
      buyerAddress: "32-A, Model Town Extension, Lahore",
      buyerArea: "Model Town",
      items: orderItems1,
      totalPkr: 5200,
      deliveryDate: makeDate(-20),
      status: "delivered",
      paymentStatus: "paid",
      source: "instagram_dm",
      occasion: "Eid",
      specialInstructions: "Eid Mubarak message please",
      createdAt: daysAgo(22),
    },
    {
      bakerId: sana.id,
      buyerId: omar.id,
      buyerName: "Omar Siddiqui",
      buyerWhatsapp: "+923004444444",
      buyerAddress: "House 12, Johar Town Block J3, Lahore",
      buyerArea: "Johar Town",
      items: orderItems3,
      totalPkr: 5300,
      deliveryDate: makeDate(2),
      status: "out_for_delivery",
      paymentStatus: "pending",
      source: "manual",
      occasion: null,
      specialInstructions: null,
      createdAt: daysAgo(1),
    },
    {
      bakerId: sana.id,
      buyerId: hira.id,
      buyerName: "Hira Tariq",
      buyerWhatsapp: "+923003333333",
      buyerAddress: "32-A, Model Town Extension, Lahore",
      buyerArea: "Model Town",
      items: orderItems2,
      totalPkr: 2200,
      deliveryDate: makeDate(-2),
      status: "cancelled",
      paymentStatus: "pending",
      source: "marketplace",
      occasion: null,
      specialInstructions: null,
      cancellationReason: "Customer rescheduled party",
      cancelledBy: "customer",
      cancelledAt: daysAgo(4),
      createdAt: daysAgo(4),
    },
    {
      bakerId: sana.id,
      buyerId: ayesha.id,
      buyerName: "Ayesha Raza",
      buyerWhatsapp: "+923001111111",
      buyerAddress: "House 45, Block C, Gulberg III, Lahore",
      buyerArea: "Gulberg",
      items: orderItems5,
      totalPkr: 5800,
      deliveryDate: makeDate(-30),
      status: "delivered",
      paymentStatus: "paid",
      source: "instagram_dm",
      occasion: "Eid",
      specialInstructions: null,
      createdAt: daysAgo(55),
    },
    {
      bakerId: sana.id,
      buyerId: zara.id,
      buyerName: "Zara Khan",
      buyerWhatsapp: "+923005555555",
      buyerAddress: "Flat 8, Pearl Residency, DHA Phase 2, Lahore",
      buyerArea: "DHA Phase 2",
      items: orderItems3,
      totalPkr: 5300,
      deliveryDate: makeDate(-45),
      status: "delivered",
      paymentStatus: "paid",
      source: "baker_whatsapp",
      occasion: "Party",
      specialInstructions: null,
      createdAt: daysAgo(72),
    },
  ]);

  await seedBakerDemoData({
    id: fatima.id,
    businessName: fatima.businessName,
    ownerName: fatima.ownerName,
    city: "Karachi",
    areas: ["Clifton", "Defence", "Bahadurabad", "Gulshan-e-Iqbal"],
    products: fatimaProducts.map((p) => ({ id: p.id, name: p.name, basePricePkr: p.basePricePkr })),
    phoneBase: "+92321876",
  });

  await seedBakerDemoData({
    id: amna.id,
    businessName: amna.businessName,
    ownerName: amna.ownerName,
    city: "Islamabad",
    areas: ["F-7", "F-8", "G-9", "Blue Area"],
    products: amnaProducts.map((p) => ({ id: p.id, name: p.name, basePricePkr: p.basePricePkr })),
    phoneBase: "+92311555",
  });

  console.log("Orders seeded");

  // --- Reviews ---
  await db.insert(reviewsTable).values([
    {
      bakerId: sana.id,
      buyerId: ayesha.id,
      buyerName: "Ayesha Raza",
      rating: 5,
      ratingProduct: 5,
      ratingPackaging: 5,
      reviewText: "Absolutely amazing! The Black Forest was perfect — everyone at the party loved it. Sana is so professional and the packaging was beautiful. Will definitely order again!",
      productName: "Classic Black Forest Cake",
    },
    {
      bakerId: sana.id,
      buyerId: hira.id,
      buyerName: "Hira Tariq",
      rating: 5,
      ratingProduct: 5,
      ratingPackaging: 4,
      reviewText: "The Gulab Jamun Cheesecake was a masterpiece. My guests couldn't believe it was homemade. The fusion of flavours is incredible.",
      productName: "Gulab Jamun Cheesecake",
    },
    {
      bakerId: sana.id,
      buyerId: zara.id,
      buyerName: "Zara Khan",
      rating: 5,
      ratingProduct: 5,
      ratingPackaging: 5,
      reviewText: "Ordered the brownies three times now — never disappointed. Extra fudgy exactly as requested!",
      productName: "Fudgy Brownies",
    },
    {
      bakerId: sana.id,
      buyerId: bilal.id,
      buyerName: "Bilal Ahmad",
      rating: 4,
      ratingProduct: 5,
      ratingPackaging: 4,
      reviewText: "Really good cake, delivered on time. Will order again for the next occasion.",
      productName: "Classic Black Forest Cake",
    },
  ]);

  console.log("Reviews seeded");

  await db.insert(bakerGoalsTable).values([
    {
      bakerId: sana.id,
      label: "Monthly orders",
      metric: "orders",
      targetValue: 50,
      period: "monthly",
    },
    {
      bakerId: fatima.id,
      label: "Monthly orders",
      metric: "orders",
      targetValue: 40,
      period: "monthly",
    },
    {
      bakerId: amna.id,
      label: "Monthly orders",
      metric: "orders",
      targetValue: 35,
      period: "monthly",
    },
  ]);
  console.log("Baker goals seeded for all demo kitchens");

  // Khata, notifications, workspace, feedback, multi-channel chats, conversation memory
  await seedFullFeaturePack({
    id: sana.id,
    businessName: sana.businessName,
    ownerName: sana.ownerName,
    phoneBase: "+92300123",
    includeWhatsAppChats: true,
    includeInstagramChats: true,
  });
  await seedFullFeaturePack({
    id: fatima.id,
    businessName: fatima.businessName,
    ownerName: fatima.ownerName,
    phoneBase: "+92321876",
    includeWhatsAppChats: true,
    includeInstagramChats: false,
  });
  await seedFullFeaturePack({
    id: amna.id,
    businessName: amna.businessName,
    ownerName: amna.ownerName,
    phoneBase: "+92311555",
    includeWhatsAppChats: false,
    includeInstagramChats: false,
  });
  console.log("Feature packs seeded (Khata, notifications, chats, feedback, workspace)");

  for (const baker of [sana, fatima, amna]) {
    const indexed = await reindexBakerKnowledge(baker.id);
    console.log(`RAG indexed ${indexed.chunks} chunks for ${baker.businessName} (${indexed.provider})`);
  }

  for (const baker of [sana, fatima, amna]) {
    await syncBakerStats(baker.id);
  }
  console.log("Baker stats synced from live order/review counts");

  console.log(`
═══════════════════════════════════════════════════════════
  Demo logins (password per baker below)
───────────────────────────────────────────────────────────
  sana@studio.com   / SanaSweet2026!   → Bakery Plus (WA+IG, Khata, Agent Hub)
  fatima@cakery.com / FatimaCake2026!  → Kitchen Standard (WA, web)
  amna@bakes.com    / AmnaBakes2026!   → Launch Free (web menu only, agent off)
───────────────────────────────────────────────────────────
  Tabs covered: Home, Orders, Catalog, Analytics, Payments,
  Customers, Calendar, Agent Hub, Khata, Settings, Notifications
═══════════════════════════════════════════════════════════
`);

  console.log("Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
