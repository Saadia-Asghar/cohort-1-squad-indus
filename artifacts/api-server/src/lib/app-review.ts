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

const ROLE_IDS = new Set<string>(APP_REVIEW_ROLES.map((role) => role.id));
const USED_HOW_IDS = new Set<string>(APP_REVIEW_USED_HOW.map((item) => item.id));

export type ParsedAppReview = {
  reviewerName: string;
  email: string | null;
  role: AppReviewRoleId;
  roleNote: string | null;
  rating: number;
  reviewText: string;
  usedHow: AppReviewUsedHowId | null;
};

export function parseAppReview(body: unknown): ParsedAppReview | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const reviewerName = typeof record.reviewerName === "string" ? record.reviewerName.trim().slice(0, 80) : "";
  const emailRaw = typeof record.email === "string" ? record.email.trim().toLowerCase().slice(0, 120) : "";
  const role = typeof record.role === "string" && ROLE_IDS.has(record.role) ? (record.role as AppReviewRoleId) : null;
  const rating = typeof record.rating === "number" ? record.rating : Number(record.rating);
  const reviewText = typeof record.reviewText === "string" ? record.reviewText.trim().slice(0, 4000) : "";
  const roleNoteRaw = typeof record.roleNote === "string" ? record.roleNote.trim().slice(0, 160) : "";
  const usedHow =
    typeof record.usedHow === "string" && USED_HOW_IDS.has(record.usedHow)
      ? (record.usedHow as AppReviewUsedHowId)
      : null;

  if (reviewerName.length < 2 || !role || !Number.isInteger(rating) || rating < 1 || rating > 5 || reviewText.length < 20) {
    return null;
  }
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) return null;
  if (role === "other" && roleNoteRaw.length < 2) return null;

  return {
    reviewerName,
    email: emailRaw || null,
    role,
    roleNote: roleNoteRaw || null,
    rating,
    reviewText,
    usedHow,
  };
}

export function appReviewRoleLabel(role: string | null | undefined): string {
  return APP_REVIEW_ROLES.find((item) => item.id === role)?.label ?? "Other";
}
