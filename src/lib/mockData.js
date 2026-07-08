// Mock data for auto-import simulation and initial seed

// Dates relative to today
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
    source: "auto_import",
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
    source: "auto_import",
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
    source: "auto_import",
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
    source: "auto_import",
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
  },
  {
    customer_name: "Sana Iqbal",
    customer_phone: "+92 300 2223344",
    cake_type: "Vanilla Birthday Cake",
    flavor: "Vanilla",
    weight: "1.5kg",
    design_notes: "Princess theme — purple & silver",
    delivery_date: dayOffset(7),
    delivery_time: "4:00 PM",
    delivery_type: "delivery",
    price: 4100,
    payment_status: "pending",
    status: "confirmed",
    source: "auto_import",
    confidence: 91
  },
  {
    customer_name: "Areeba Javed",
    customer_phone: "+92 333 6667788",
    cake_type: "Chocolate Truffle",
    flavor: "Chocolate",
    weight: "2kg",
    design_notes: "Get well soon",
    delivery_date: dayOffset(-3),
    delivery_time: "6:00 PM",
    delivery_type: "delivery",
    price: 4500,
    payment_status: "paid",
    status: "completed",
    source: "manual",
    confidence: null
  },
  {
    customer_name: "Nimra Sheikh",
    customer_phone: "+92 345 9990011",
    cake_type: "Pistachio Cake",
    flavor: "Pistachio",
    weight: "1kg",
    design_notes: "Eid Mubarak",
    delivery_date: dayOffset(-5),
    delivery_time: "10:00 AM",
    delivery_type: "pickup",
    price: 3500,
    payment_status: "paid",
    status: "completed",
    source: "auto_import",
    confidence: 93
  }
];

// Simulated WhatsApp extraction results for auto-import flow
export const mockExtractionResults = [
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
    confidence: 95,
    needsReview: false,
    missingFields: []
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
    confidence: 92,
    needsReview: false,
    missingFields: []
  },
  {
    customer_name: "Zainab Malik",
    customer_phone: "+92 333 5557788",
    cake_type: "Strawberry Cream",
    flavor: "Strawberry",
    weight: "1kg",
    design_notes: "Baby shower — pink & white",
    delivery_date: dayOffset(5),
    delivery_time: "11:00 AM",
    delivery_type: "delivery",
    price: 3800,
    payment_status: "pending",
    confidence: 88,
    needsReview: false,
    missingFields: []
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
    confidence: 48,
    needsReview: true,
    missingFields: ["weight", "delivery_date", "price"]
  }
];

export const processingSteps = [
  "Connecting to WhatsApp...",
  "Reading messages...",
  "Analyzing conversations...",
  "Identifying orders...",
  "Extracting cake details...",
  "Validating information...",
  "Finalizing results..."
];