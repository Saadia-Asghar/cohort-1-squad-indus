// Mock data for auto-import simulation and initial seed

function dayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const seedOrders = [
  {
    customer_name: "Ayesha Khan",
    customer_phone: "+92 300 1234567",
    cake_type: "Chocolate Truffle",
    flavor: "Chocolate",
    weight: "2kg",
    design_notes: "Happy Birthday Sara — with gold leaf",
    delivery_date: dayOffset(0),
    delivery_time: "3:00 PM",
    delivery_type: "delivery",
    price: 4500,
    payment_status: "pending",
    status: "confirmed",
    special_requests: "No nuts allergy",
    source: "whatsapp",
    confidence: 95
  },
  {
    customer_name: "Fatima Ahmed",
    customer_phone: "+92 321 9876543",
    cake_type: "Vanilla Buttercream",
    flavor: "Vanilla",
    weight: "1.5kg",
    design_notes: "Congratulations Graduate",
    delivery_date: dayOffset(0),
    delivery_time: "5:30 PM",
    delivery_type: "pickup",
    price: 3200,
    payment_status: "paid",
    status: "in_progress",
    source: "manual",
    confidence: null
  },
  {
    customer_name: "Zainab Malik",
    customer_phone: "+92 333 5557788",
    cake_type: "Strawberry Cream",
    flavor: "Strawberry",
    weight: "1kg",
    design_notes: "Baby shower theme — pink & white",
    delivery_date: dayOffset(0),
    delivery_time: "11:00 AM",
    delivery_type: "delivery",
    price: 3800,
    payment_status: "paid",
    status: "delivered",
    source: "instagram",
    confidence: 88
  },
  {
    customer_name: "Hina Raza",
    customer_phone: "+92 345 1112233",
    cake_type: "Red Velvet",
    flavor: "Red Velvet",
    weight: "2kg",
    design_notes: "Anniversary — heart shape",
    delivery_date: dayOffset(2),
    delivery_time: "7:00 PM",
    delivery_type: "delivery",
    price: 5200,
    payment_status: "partial",
    status: "confirmed",
    source: "instagram",
    confidence: 82
  },
  {
    customer_name: "Rabia Saleem",
    customer_phone: "+92 301 4445566",
    cake_type: "Carrot Cake",
    flavor: "Carrot",
    weight: "1kg",
    design_notes: "",
    delivery_date: dayOffset(4),
    delivery_time: "2:00 PM",
    delivery_type: "pickup",
    price: 2800,
    payment_status: "pending",
    status: "pending_info",
    special_requests: "Size not confirmed in message",
    source: "whatsapp",
    confidence: 55
  },
  {
    customer_name: "Mahnoor Tariq",
    customer_phone: "+92 322 7778899",
    cake_type: "Chocolate Fudge",
    flavor: "Chocolate",
    weight: "3kg",
    design_notes: "Happy 30th Birthday Ali",
    delivery_date: dayOffset(5),
    delivery_time: "8:00 PM",
    delivery_type: "delivery",
    price: 6800,
    payment_status: "paid",
    status: "confirmed",
    source: "manual",
    confidence: null
  }
];

// WhatsApp extraction results
export const mockWhatsAppResults = [
  {
    customer_name: "Ayesha Khan",
    customer_phone: "+92 300 1234567",
    cake_type: "Chocolate Truffle",
    flavor: "Chocolate",
    weight: "2kg",
    design_notes: "Happy Birthday Sara — with gold leaf",
    delivery_date: dayOffset(3),
    delivery_time: "3:00 PM",
    delivery_type: "delivery",
    price: 4500,
    payment_status: "pending",
    special_requests: "No nuts — allergy",
    source: "whatsapp",
    confidence: 95,
    needsReview: false,
    missingFields: [],
    preview: "Assalam o Alaikum! I want to order a chocolate truffle cake 2kg for my daughter Sara's birthday on the 14th, 3pm delivery. No nuts please she's allergic. Price ok?"
  },
  {
    customer_name: "Fatima Ahmed",
    customer_phone: "+92 321 9876543",
    cake_type: "Vanilla Buttercream",
    flavor: "Vanilla",
    weight: "1.5kg",
    design_notes: "Congratulations Graduate",
    delivery_date: dayOffset(4),
    delivery_time: "5:30 PM",
    delivery_type: "pickup",
    price: 3200,
    payment_status: "paid",
    source: "whatsapp",
    confidence: 92,
    needsReview: false,
    missingFields: [],
    preview: "Hi Zara! Can I pick up a vanilla cake 1.5kg on Thursday evening around 5:30? Write 'Congratulations Graduate' on it. I'll pay on pickup."
  },
  {
    customer_name: "Hina Raza",
    customer_phone: "+92 345 1112233",
    cake_type: "Red Velvet",
    flavor: "Red Velvet",
    weight: null,
    design_notes: "Anniversary — heart shape",
    delivery_date: null,
    delivery_time: null,
    delivery_type: "delivery",
    price: null,
    payment_status: "pending",
    source: "whatsapp",
    confidence: 48,
    needsReview: true,
    missingFields: ["weight", "delivery_date", "price"],
    preview: "AOA I want red velvet for my anniversary 💕 heart shape. Can you deliver? Please tell me price."
  }
];

// Instagram DM extraction results
export const mockInstagramResults = [
  {
    customer_name: "Sara Siddiqui",
    customer_phone: null,
    cake_type: "Unicorn Cake",
    flavor: "Strawberry",
    weight: "2kg",
    design_notes: "Rainbow unicorn, lots of sprinkles, purple theme",
    delivery_date: dayOffset(5),
    delivery_time: "2:00 PM",
    delivery_type: "delivery",
    price: 5500,
    payment_status: "pending",
    special_requests: "Eggless please!",
    source: "instagram",
    instagram_handle: "@sara.bakes22",
    confidence: 89,
    needsReview: false,
    missingFields: [],
    preview: "Omg I LOVE your cakes!! Can I order a unicorn cake for my daughter's birthday? 2kg strawberry, purple theme, eggless! Delivery to DHA on the 16th 2pm 🦄✨"
  },
  {
    customer_name: "Noor Fatima",
    customer_phone: null,
    cake_type: "Drip Cake",
    flavor: "Chocolate",
    weight: "1.5kg",
    design_notes: "Gold drip, macarons on top, birthday girl vibes",
    delivery_date: dayOffset(6),
    delivery_time: "6:00 PM",
    delivery_type: "pickup",
    price: 4800,
    payment_status: "advance",
    source: "instagram",
    instagram_handle: "@noor_official_",
    confidence: 91,
    needsReview: false,
    missingFields: [],
    preview: "Hi! I saw your drip cake reel and I'm obsessed 😍 can I get something similar? 1.5kg choc, gold drip, macarons. Pickup on Friday evening. Will send advance."
  },
  {
    customer_name: "Maha Asif",
    customer_phone: null,
    cake_type: "Fondant Cake",
    flavor: "Vanilla",
    weight: null,
    design_notes: "Floral design, pastel pink",
    delivery_date: null,
    delivery_time: null,
    delivery_type: "delivery",
    price: null,
    payment_status: "pending",
    source: "instagram",
    instagram_handle: "@maha.a",
    confidence: 52,
    needsReview: true,
    missingFields: ["weight", "delivery_date", "price"],
    preview: "Your floral cakes are so pretty 💐 I want one like that for my mom's birthday. Vanilla please, pastel pink. How much would it cost? When can you deliver?"
  }
];

export const mockExtractionResults = mockWhatsAppResults;

export const whatsappProcessingSteps = [
  "Connecting to WhatsApp...",
  "Reading last 24h messages...",
  "Scanning conversations...",
  "Identifying cake orders...",
  "Extracting details with AI...",
  "Validating information...",
  "Finalizing results..."
];

export const instagramProcessingSteps = [
  "Connecting to Instagram...",
  "Reading DM inbox...",
  "Scanning conversations...",
  "Identifying cake orders...",
  "Extracting details with AI...",
  "Validating information...",
  "Finalizing results..."
];

export const processingSteps = whatsappProcessingSteps;
