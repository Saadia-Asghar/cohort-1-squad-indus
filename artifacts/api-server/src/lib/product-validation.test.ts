import { describe, expect, it } from "vitest";
import { sanitizeProductFields, toTitleCase } from "./product-validation.js";

describe("sanitizeProductFields", () => {
  it("title-cases names and rejects huge prices", () => {
    expect(toTitleCase("red velvet CAKE")).toBe("Red Velvet Cake");
    expect(sanitizeProductFields({ basePricePkr: 200_000_000 }).error).toMatch(/PKR/);
    expect(sanitizeProductFields({ category: "Wedding Mega Cake" }).error).toMatch(/category/);
  });

  it("blocks contradictory allergen and free-from labels", () => {
    expect(sanitizeProductFields({
      dietaryTags: ["Egg-free"],
      allergens: ["Contains eggs"],
    }).error).toMatch(/contradictory/);
  });
});
