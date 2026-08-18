export const APP_REVIEW_ROLES = [
  { id: "home_baker", label: "Home baker" },
  { id: "student", label: "Student" },
  { id: "developer", label: "Developer" },
  { id: "designer", label: "Designer" },
  { id: "founder", label: "Founder or teammate" },
  { id: "investor", label: "Investor or mentor" },
  { id: "other", label: "Other" },
] as const;

export const APP_REVIEW_USED_HOW = [
  { id: "browsed", label: "I browsed the website" },
  { id: "demo", label: "I tried a demo bakery login" },
  { id: "account", label: "I created an account" },
  { id: "menu", label: "I opened a shared menu" },
  { id: "other", label: "Something else" },
] as const;

export type AppReviewRoleId = (typeof APP_REVIEW_ROLES)[number]["id"];
export type AppReviewUsedHowId = (typeof APP_REVIEW_USED_HOW)[number]["id"];
