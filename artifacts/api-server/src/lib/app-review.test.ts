import { describe, expect, it } from "vitest";
import { appReviewRoleLabel, parseAppReview } from "./app-review.js";

describe("parseAppReview", () => {
  it("accepts a student developer review without a bakery account", () => {
    const parsed = parseAppReview({
      reviewerName: "Ayesha",
      email: "ayesha@university.edu",
      role: "student",
      rating: 4,
      reviewText: "The shared menu is clear. Signup asked which tools I care about.",
      usedHow: "browsed",
    });
    expect(parsed).toMatchObject({
      reviewerName: "Ayesha",
      role: "student",
      roleNote: null,
      rating: 4,
      usedHow: "browsed",
    });
  });

  it("accepts a developer review with no email", () => {
    const parsed = parseAppReview({
      reviewerName: "Hassan",
      role: "developer",
      rating: 5,
      reviewText: "Admin bakery monitor and waitlist are easy to demo to a cohort jury.",
    });
    expect(parsed?.email).toBeNull();
    expect(parsed?.role).toBe("developer");
  });

  it("requires a short note when the role is Other", () => {
    expect(
      parseAppReview({
        reviewerName: "Noor",
        role: "other",
        rating: 4,
        reviewText: "The homepage waitlist and review buttons are easy to find.",
      }),
    ).toBeNull();
    expect(
      parseAppReview({
        reviewerName: "Noor",
        role: "other",
        roleNote: "CS student at FAST",
        rating: 4,
        reviewText: "The homepage waitlist and review buttons are easy to find.",
      }),
    ).toMatchObject({ role: "other", roleNote: "CS student at FAST" });
  });

  it("rejects baker-only assumptions and thin reviews", () => {
    expect(parseAppReview({ reviewerName: "A", role: "student", rating: 5, reviewText: "Nice" })).toBeNull();
    expect(parseAppReview({ reviewerName: "Ayesha", role: "customer", rating: 5, reviewText: "A long enough review text here." })).toBeNull();
    expect(parseAppReview({ reviewerName: "Ayesha", role: "student", rating: 8, reviewText: "A long enough review text here." })).toBeNull();
  });

  it("labels roles for the admin table", () => {
    expect(appReviewRoleLabel("developer")).toBe("Developer");
    expect(appReviewRoleLabel("home_baker")).toBe("Home baker");
  });
});
