export const MEMORY_STUB_SUMMARIES = new Set([
  "Recent menu conversation saved.",
  "Customer needs a baker follow-up.",
  "Customer needs baker follow-up.",
]);

const DEFAULT_AREAS = [
  "dha",
  "gulberg",
  "clifton",
  "defence",
  "bahria",
  "johar",
  "model town",
  "cavalry",
  "cantt",
  "f-7",
  "f-8",
  "f-10",
  "g-9",
  "gulshan",
  "nazimabad",
  "pechs",
];

const EGGLESS_MARKERS = [
  "eggless",
  "no egg",
  "egg free",
  "egg-free",
  "anda nahi",
  "anda nahe",
  "anda nai",
  "anday nahi",
  "bina anda",
  "without egg",
];

const OCCASIONS: Array<{ match: RegExp; label: string }> = [
  { match: /\bbirthday\b|salgirah|janam din/, label: "birthday" },
  { match: /\banniversary\b/, label: "anniversary" },
  { match: /\beid\b/, label: "eid" },
  { match: /\bwalima\b|\bmehndi\b|\bbarat\b/, label: "wedding" },
];

function normalizeHaystack(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+e\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractPreferences(
  message: string,
  existing: Record<string, unknown>,
  deliveryAreas: string[] = [],
): Record<string, unknown> {
  const prefs: Record<string, unknown> = { ...existing };
  const lowerMsg = normalizeHaystack(message);

  if (!prefs.pinEggless) {
    if (EGGLESS_MARKERS.some((marker) => lowerMsg.includes(marker))) {
      prefs.eggless = true;
    }
  }

  const areaCandidates = [
    ...deliveryAreas.map((area) => area.trim()).filter(Boolean),
    ...DEFAULT_AREAS,
  ];
  for (const area of areaCandidates) {
    const needle = normalizeHaystack(area);
    if (needle.length >= 3 && lowerMsg.includes(needle)) {
      prefs.preferredArea = area.length <= 4 ? area.toUpperCase() : area;
      break;
    }
  }

  const allergyMatch =
    lowerMsg.match(/allerg(?:ic|y)(?:\s+hai)?(?:\s+to)\s+([a-z]{2,40})/) ??
    lowerMsg.match(/\ballergy\s+([a-z]{2,40})/);
  if (allergyMatch?.[1]) {
    const allergies = Array.isArray(prefs.allergies) ? [...(prefs.allergies as string[])] : [];
    const allergy = allergyMatch[1].replace(/\b(please|hai|he)\b/g, "").trim().slice(0, 80);
    if (allergy && !allergies.includes(allergy)) {
      prefs.allergies = [...allergies.slice(0, 4), allergy];
    }
  }

  for (const occasion of OCCASIONS) {
    if (occasion.match.test(lowerMsg)) {
      prefs.occasion = occasion.label;
      break;
    }
  }

  const servings = lowerMsg.match(/\b(\d+\s?(?:kg|pound|lb|dozen|people|seats))\b/);
  if (servings?.[1]) prefs.servings = servings[1];

  if (typeof existing.bakerNote === "string") {
    prefs.bakerNote = existing.bakerNote;
  }
  if (existing.pinEggless === true) {
    prefs.pinEggless = true;
    prefs.eggless = existing.eggless === true;
  }

  return prefs;
}

function slotLine(preferences: Record<string, unknown>): string {
  const parts: string[] = [];
  if (preferences.eggless) parts.push("Eggless");
  if (typeof preferences.preferredArea === "string" && preferences.preferredArea.trim()) {
    parts.push(`Prefers ${preferences.preferredArea.trim()}`);
  }
  if (typeof preferences.occasion === "string" && preferences.occasion.trim()) {
    parts.push(preferences.occasion.trim());
  }
  if (typeof preferences.servings === "string" && preferences.servings.trim()) {
    parts.push(preferences.servings.trim());
  }
  const allergies = Array.isArray(preferences.allergies)
    ? preferences.allergies.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  if (allergies.length) parts.push(`Avoid ${allergies.join(", ")}`);
  if (typeof preferences.bakerNote === "string" && preferences.bakerNote.trim()) {
    parts.push(preferences.bakerNote.trim().slice(0, 80));
  }
  return parts.join(". ");
}

export function buildMemorySummary(input: {
  previousSummary?: string | null;
  preferences: Record<string, unknown>;
  escalated: boolean;
}): string {
  const slots = slotLine(input.preferences);
  const previous = (input.previousSummary ?? "").trim();
  const previousIsStub = !previous || MEMORY_STUB_SUMMARIES.has(previous);

  if (input.escalated) {
    const followUp = slots ? `${slots}. Needs baker follow-up.` : "Customer needs a baker follow-up.";
    return followUp.slice(0, 240);
  }

  if (slots) {
    if (!previousIsStub && previous.startsWith(slots)) return previous.slice(0, 240);
    return slots.slice(0, 240);
  }

  if (!previousIsStub) return previous.slice(0, 240);
  return "Menu conversation in progress.";
}
