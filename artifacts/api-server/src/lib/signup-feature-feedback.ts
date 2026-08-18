export const SIGNUP_FEATURE_IDS = ["assistant", "orders", "payments", "calendar"] as const;
export type SignupFeatureId = (typeof SIGNUP_FEATURE_IDS)[number];

const ALLOWED = new Set<string>(SIGNUP_FEATURE_IDS);

export type SignupFeatureFeedback = {
  featureIds: SignupFeatureId[];
  note: string | null;
  skipped: boolean;
};

export function parseSignupFeatureFeedback(body: unknown): SignupFeatureFeedback | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const skipped = record.skipped === true;
  const noteRaw = typeof record.note === "string" ? record.note.trim().slice(0, 400) : "";
  const ids = Array.isArray(record.featureIds)
    ? [...new Set(record.featureIds.filter((id): id is SignupFeatureId => typeof id === "string" && ALLOWED.has(id)))]
    : [];

  if (!skipped && ids.length === 0 && !noteRaw) return null;

  return {
    featureIds: ids,
    note: noteRaw || null,
    skipped,
  };
}
