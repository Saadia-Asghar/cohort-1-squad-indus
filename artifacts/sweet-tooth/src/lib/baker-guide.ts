export type GuideSection = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
};

export const BAKER_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "first-15-minutes",
    title: "Your first 15 minutes",
    summary: "Complete these in order before sending your Sweet Tooth link to customers.",
    steps: [
      "Finish Kitchen Details in Settings: bakery name, WhatsApp number, city and delivery areas.",
      "Set delivery, pickup and cancellation rules so the assistant never has to guess.",
      "Add payment account details and your normal advance/deposit rule.",
      "Publish at least one real menu item with price, lead time, allergens and availability.",
      "Open Agent Hub and write your greeting, kitchen hours, dietary policy and escalation rules.",
      "Use the Agent Hub test chat to ask the same questions your customers normally ask.",
      "Preview the public storefront, then share the menu link or QR only when the answers look correct.",
    ],
  },
  {
    id: "catalog",
    title: "Menu & product setup",
    summary: "Your menu is the main source the assistant uses for product answers.",
    steps: [
      "Open Catalog → tap Manage on a product or create a new item.",
      "Use the exact selling price customers should see.",
      "Set ready time (days + hours) so the assistant gives realistic availability.",
      "Mark Sold out whenever you cannot accept more orders for that product.",
      "Add ingredients and allergen tags such as nuts, dairy, eggs or gluten.",
      "Choose useful suggestion tags such as Birthday, Eid or Eggless.",
      "Enable Home delivery and/or Pickup only when you actually offer them.",
      "Save the item and re-test a product question in Agent Hub.",
    ],
  },
  {
    id: "agent",
    title: "AI assistant & bakery rules",
    summary: "The assistant should answer from your bakery information, not invent policies.",
    steps: [
      "Open Agent Hub and write a short greeting in your normal customer-service tone.",
      "Set kitchen hours, delivery rules, dietary policy, offers and common answers.",
      "Add escalation keywords for situations where you want a human to take over.",
      "Reindex Knowledge after major menu or policy changes.",
      "Test price, availability, delivery, allergy and custom-order questions before going live.",
      "If WhatsApp or Instagram automation is not connected for the pilot, use the web assistant/storefront and do not promise automatic Meta replies yet.",
    ],
  },
  {
    id: "payments",
    title: "Payments & advance proof",
    summary: "Keep payment evidence with the correct order and confirm it yourself.",
    steps: [
      "Add JazzCash, Easypaisa or bank-transfer details in Settings.",
      "Set the advance/deposit rule you normally use for custom orders.",
      "Buyers can attach receipt screenshots to the order.",
      "Open Payments to compare the amount and reference details.",
      "AI/OCR can assist with reading the screenshot where available, but the baker confirms the payment.",
      "Do not start production from a screenshot alone if you have not verified the money.",
    ],
  },
  {
    id: "orders",
    title: "Order pipeline",
    summary: "Move every confirmed job through one visible production flow.",
    steps: [
      "New orders appear in Orders and on the Overview page.",
      "Check the customer name, products, cake message, delivery time, address and payment status.",
      "Move the order through confirmed → in production → out for delivery → delivered.",
      "Use the production checklist instead of keeping the next step in memory.",
      "When an order is delivered, review any customer feedback that appears in Analytics.",
    ],
  },
  {
    id: "calendar",
    title: "Production calendar",
    summary: "Use the calendar to protect your capacity and delivery deadlines.",
    steps: [
      "Open Calendar before accepting heavy delivery days.",
      "Check confirmed orders by required date and time.",
      "Plan baking, decoration, packing and dispatch around the real deadline.",
      "Use unavailable or sold-out settings when your kitchen is at capacity.",
      "Review the next day before you finish work each evening.",
    ],
  },
  {
    id: "customers",
    title: "Customer memory",
    summary: "Sweet Tooth becomes more valuable when repeat-customer context stays organized.",
    steps: [
      "Open Customers to review order history and regular buyers.",
      "Keep useful notes that improve future service without storing unnecessary sensitive information.",
      "Review at-risk regulars who have not ordered recently.",
      "Use past order preferences as context, not as permission to spam customers.",
    ],
  },
  {
    id: "analytics",
    title: "Analytics & feedback",
    summary: "Use the numbers to decide what to do next, not just to look at charts.",
    steps: [
      "Check revenue, order volume and top products.",
      "Review customer feedback and service-quality signals.",
      "Look for busy days before deciding when to stop accepting orders.",
      "Use customer and product trends to plan campaigns or seasonal offers.",
      "During the paid pilot, measure real orders, AI replies and support time so pricing can be improved with evidence.",
    ],
  },
  {
    id: "policies",
    title: "Delivery, pickup & cancellation",
    summary: "Clear policies protect both the baker and the customer.",
    steps: [
      "Configure delivery areas and pickup availability in Settings.",
      "Set cancellation rules in plain language.",
      "Keep lead times realistic for custom products.",
      "Review policies whenever your delivery coverage, prices or kitchen capacity changes.",
    ],
  },
  {
    id: "launch",
    title: "Before you share your link",
    summary: "Run one complete test order yourself before inviting real customers.",
    steps: [
      "Open your public storefront on a phone.",
      "Ask the assistant a real product question.",
      "Create a test order and check that all important details reach the dashboard.",
      "Attach a test payment screenshot if that workflow is enabled.",
      "Move the test order through the production statuses.",
      "Check the experience on both mobile and desktop.",
      "Only then share the public menu link or QR with customers.",
    ],
  },
];