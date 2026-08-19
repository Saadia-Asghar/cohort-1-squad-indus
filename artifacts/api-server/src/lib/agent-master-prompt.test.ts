import { describe, expect, it } from "vitest";
import { buildCatalogCard, buildMasterPrompt, buildSlotBoard, groundedFallbackReply, toLlmTurns } from "./agent-master-prompt.js";

const fatima = {
  businessName: "Fatima's Cakery",
  city: "Karachi",
  tagline: "Every bite tells a story",
  deliveryAreas: ["Clifton", "Defence"],
  codPolicy: "Cash on delivery (COD) only.",
};

const menu = [
  {
    name: "Pastel Bento Cake",
    description: "A small hand-piped celebration cake with a custom message.",
    basePricePkr: 1850,
    leadTimeDays: 2,
    isAvailable: true,
    sizes: [{ label: "4 inch", pricePkr: 1850 }],
  },
  {
    name: "Fondant Wedding Cake",
    description: "Elegant custom wedding cakes with sugar flowers.",
    basePricePkr: 15000,
    leadTimeDays: 7,
    isAvailable: true,
  },
];

describe("master prompt system", () => {
  it("grounds the model in catalog, areas, and one next slot", () => {
    const prompt = buildMasterPrompt({
      baker: fatima,
      products: menu,
      retrievedContext: "Payment policy: COD. Max orders per day: 10",
      slots: { lastItem: "Pastel Bento Cake" },
      channel: "web",
    });
    expect(prompt).toContain("Fatima's Cakery");
    expect(prompt).toContain("Pastel Bento Cake");
    expect(prompt).toContain("Clifton");
    expect(prompt).toContain("Never invent");
    expect(prompt).toContain("Ask only for area or pickup");
    expect(prompt).toContain("Do not mention a bag");
    expect(prompt).toContain("BAKER PLAYBOOK");
    expect(prompt).toContain("No generic closers");
  });

  it("lets the baker playbook change tone without replacing catalog prices", () => {
    const prompt = buildMasterPrompt({
      baker: { ...fatima, shopPlaybook: "Always mention 48-hour notice for wedding cakes." },
      products: menu,
      slots: {},
    });
    expect(prompt).toContain("48-hour notice");
    expect(prompt).toContain("cannot invent prices");
  });

  it("lists published cakes without dumping policy blobs as the voice", () => {
    const card = buildCatalogCard(menu);
    expect(card).toContain("Pastel Bento Cake");
    expect(card).toContain("PKR 1850");
    expect(buildSlotBoard({}).missing[0]).toBe("which cake");
  });

  it("sends recent turns plus the latest buyer line", () => {
    const turns = toLlmTurns(
      [
        { role: "user", content: "Show Menu" },
        { role: "assistant", content: "Here is the menu." },
        { role: "user", content: "book it" },
      ],
      "book it",
    );
    expect(turns.at(-1)).toEqual({ role: "user", content: "book it" });
    expect(turns.filter((turn) => turn.role === "user" && turn.content.includes("book it"))).toHaveLength(1);
    expect(turns.some((turn) => turn.content.includes("Here is the menu"))).toBe(true);
  });

  it("asks the next slot from catalog facts when no model key is set", () => {
    const withCake = groundedFallbackReply({
      bakerName: "Fatima's Cakery",
      products: menu,
      slots: { lastItem: "Pastel Bento Cake" },
    });
    expect(withCake.escalated).toBe(false);
    expect(withCake.reply).toContain("Pastel Bento Cake");
    expect(withCake.reply).toMatch(/area or pickup/i);
    expect(withCake.reply).not.toMatch(/Would you like to order or need more details/);
  });
});
