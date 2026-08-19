import { describe, expect, it } from "vitest";
import { sanitizeProductFields, toTitleCase } from "./product-validation.js";

describe("sanitizeProductFields", () => {
  it("title-cases names and rejects huge prices", () => {
    expect(toTitleCase("red velvet CAKE")).toBe("Red Velvet Cake");
    expect(sanitizeProductFields({ basePricePkr: 200_000_000 }).error).toMatch(/PKR/);
    expect(sanitizeProductFields({ category: "Wedding Mega Cake" }).value?.category).toBe("Other");
    expect(sanitizeProductFields({ category: "Wedding Cakes" }).value?.category).toBe("Cakes");
    expect(sanitizeProductFields({ category: "Dessert Boxes" }).value?.category).toBe("Desserts");
  });

  it("blocks contradictory allergen and free-from labels", () => {
    expect(sanitizeProductFields({
      dietaryTags: ["Egg-free"],
      allergens: ["Contains eggs"],
    }).error).toMatch(/contradictory/);
  });

  it("keeps compressed data-URL photos instead of truncating them", () => {
    const photoUrl = `data:image/jpeg;base64,${"A".repeat(8000)}`;
    expect(sanitizeProductFields({ photoUrl }).value?.photoUrl).toBe(photoUrl);
    expect(sanitizeProductFields({ photoUrl: "https://images.unsplash.com/photo-1" }).value?.photoUrl).toBe(
      "https://images.unsplash.com/photo-1",
    );
  });
});
