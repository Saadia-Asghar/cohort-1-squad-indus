export type AgentLanguage = "english" | "urdu" | "roman_urdu" | "bilingual";

const ROMAN_URDU_FOOTERS: Array<{ match: RegExp; line: string }> = [
  {
    match: /would you like to see the menu|see the menu\?/i,
    line: "Kya aap menu dekhna chahenge? Reply karein ya apni pasand bata dein.",
  },
  {
    match: /add it to your (bag|order)/i,
    line: "Order bag mein add kar dein, ya quantity aur date likh dein.",
  },
  {
    match: /^Payment policy:/i,
    line: "Payment ki details upar English mein hain.",
  },
  {
    match: /delivers to:|which area —|which area are you/i,
    line: "Apna area likhein — jaise Clifton ya Defence.",
  },
];

export function normalizeAgentLanguage(value: unknown): AgentLanguage {
  if (value === "english" || value === "urdu" || value === "roman_urdu" || value === "bilingual") {
    return value;
  }
  return "bilingual";
}

export function applyAgentLanguage(reply: string, language: AgentLanguage, businessName: string): string {
  if (language === "english") return reply;

  if (language === "urdu") {
    const footer = `\n\n— ${businessName} سے رابطہ: مینو، قیمت، یا آرڈر کے لیے لکھیں۔`;
    return reply.includes("—") ? reply : `${reply}${footer}`;
  }

  if (language === "roman_urdu") {
    for (const { match, line } of ROMAN_URDU_FOOTERS) {
      if (match.test(reply)) {
        return `${reply}\n\n${line}`;
      }
    }
    return `${reply}\n\n${businessName} ke menu aur order ke liye yahan likhein — main foran jawab doonga/doongi.`;
  }

  for (const { match, line } of ROMAN_URDU_FOOTERS) {
    if (match.test(reply)) {
      return `${reply}\n\n${line}`;
    }
  }
  return reply;
}

export const AGENT_LANGUAGE_OPTIONS: Array<{ value: AgentLanguage; label: string; hint: string }> = [
  { value: "bilingual", label: "English + Roman Urdu (recommended)", hint: "Best for Pakistan buyers — English first, Roman Urdu helper line." },
  { value: "roman_urdu", label: "Roman Urdu friendly", hint: "Adds Roman Urdu prompts on every reply." },
  { value: "urdu", label: "Urdu script footer", hint: "English reply with Urdu script sign-off." },
  { value: "english", label: "English only", hint: "No Urdu lines added." },
];
