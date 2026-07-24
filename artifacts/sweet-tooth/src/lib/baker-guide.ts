export type GuideSection = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
};

export const BAKER_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "catalog",
    title: "Menu & product setup",
    summary: "Set lead times, allergens, and availability so your agent answers correctly.",
    steps: [
      "Open Catalog → tap Manage on any product.",
      "Set ready time (days + hours) — the agent tells buyers when it can be delivered.",
      "Mark Sold out when you cannot take more orders for that item.",
      "Add ingredients (e.g. almond flour, gluten-free flour) and allergen tags.",
      "Choose suggestion tags (Birthday, Eid, Eggless) so buyers find the right item.",
      "Enable Home delivery and/or Pickup from your kitchen.",
      "Tap Save — the agent re-indexes your menu automatically.",
    ],
  },
  {
    id: "orders",
    title: "Order pipeline",
    summary: "Move orders from new → confirmed → in production → out for delivery → delivered.",
    steps: [
      "New orders appear in Orders and on your dashboard overview.",
      "Update status as you bake and dispatch.",
      "When you mark Delivered, Sweet Tooth automatically asks the buyer for feedback on WhatsApp.",
      "Feedback (Loved it / Okay / Had an issue) appears in Analytics → Service quality.",
    ],
  },
  {
    id: "agent",
    title: "AI agent & memory",
    summary: "The agent reads your live menu, policies, and product facts — not guesses.",
    steps: [
      "Agent Hub → test sample questions before buyers see replies.",
      "Set dietary policy, offers, and kitchen hours in Agent Hub.",
      "After menu changes, tap Reindex Knowledge so the agent’s RAG fallback stays up to date.",
      "Escalation keywords notify you when a buyer needs a human.",
    ],
  },
  {
    id: "policies",
    title: "Delivery, pickup & cancellation",
    summary: "Configure in Settings → Kitchen policies.",
    steps: [
      "Allow home delivery and/or pickup from your address.",
      "Set cancellation rules: hours before delivery, or no cancellations.",
      "Write a plain-language cancellation policy — the agent quotes it to buyers.",
      "Delivery areas stay in Settings → Kitchen Details.",
    ],
  },
  {
    id: "payments",
    title: "Payments & COD",
    summary: "Review JazzCash / Easypaisa screenshots in Payments.",
    steps: [
      "Add payment account details in Settings.",
      "Buyers upload receipt screenshots; you confirm in Payments.",
      "Advance deposit rules apply automatically on large custom orders.",
    ],
  },
  {
    id: "analytics",
    title: "Analytics & feedback",
    summary: "Track sales, happy customers, and who to win back.",
    steps: [
      "Analytics → Sales for revenue and top products.",
      "Service quality card shows delivery feedback rates.",
      "Customers → at-risk regulars who have not ordered in 30+ days.",
      "Marketing tab → broadcast templates for WhatsApp campaigns.",
    ],
  },
];
