import { describe, expect, it } from "vitest";
import {
  hasBookingConfirmIntent,
  hasFlavorIntent,
  hasGreetingIntent,
  hasOrderIntent,
  hasOrderStatusIntent,
  greetingShouldYieldToTask,
  resolveFocusProduct,
  spokenCity,
  findSpokenArea,
} from "./agent-intent.js";

const fatimaMenu = [
  { name: "Fondant Wedding Cake" },
  { name: "Mini Dessert Table Box" },
  { name: "Pastel Bento Cake" },
];

describe("agent intent from Fatima chat", () => {
  it("does not treat Karachi as a hello", () => {
    expect(hasGreetingIntent("karachi")).toBe(false);
    expect(spokenCity("karachi")).toBe("Karachi");
    expect(greetingShouldYieldToTask("karachi")).toBe(true);
  });

  it("still greets a real hi", () => {
    expect(hasGreetingIntent("hi")).toBe(true);
    expect(greetingShouldYieldToTask("hi")).toBe(false);
  });

  it("reads flavour questions even with typos in want", () => {
    expect(hasFlavorIntent("I wnat a cake what flavouers are there")).toBe(true);
    expect(hasOrderIntent("I wnat a cake what flavouers are there")).toBe(true);
  });

  it("treats book it / order as continuing the last cake", () => {
    expect(hasBookingConfirmIntent("book it")).toBe(true);
    expect(hasOrderIntent("order")).toBe(true);
    const focus = resolveFocusProduct(
      "book it",
      fatimaMenu,
      undefined,
      "I found something relevant on our menu:\nProduct: Pastel Bento Cake",
    );
    expect(focus?.name).toBe("Pastel Bento Cake");
  });

  it("does not guess a cake after a full menu dump", () => {
    const menuDump = fatimaMenu.map((item) => `• *${item.name}* — PKR 1`).join("\n");
    expect(resolveFocusProduct("book it", fatimaMenu, undefined, menuDump)).toBeNull();
  });

  it("picks Clifton from an order message", () => {
    expect(findSpokenArea("clifton , order theri cake", ["Clifton", "Defence"])).toBe("Clifton");
    expect(hasOrderIntent("clifton , order theri cake")).toBe(true);
  });

  it("recognises order status without placing a new order", () => {
    expect(hasOrderStatusIntent("What is my order status?")).toBe(true);
    expect(hasOrderStatusIntent("What is your payment policy?")).toBe(false);
  });
});
