export type AgentLanguage = "english" | "urdu" | "roman_urdu" | "bilingual";

const ROMAN_URDU_FOOTERS: Array<{ match: RegExp; line: string }> = [
  {
    match: /would you like to see our menu|see our menu/i,
    line: "Kya aap menu dekhna chahenge? Reply karein ya apni pasand bata dein.",
  },
  {
    match: /would you like to add|add it to your order/i,
    line: "Order mein add karun? Quantity aur size bata dein.",
  },
  {
    match: /payment policy|cash on delivery|cod/i,
    line: "Payment: advance ya delivery par cash — details upar hain.",
  },
  {
    match: /delivery|deliver to|pickup/i,
    line: "Delivery area ya pickup confirm karne ke liye apna sector/area likhein.",
  },
  {
    match: /welcome|assalam|help you order/i,
    line: "Main aap ki madad ke liye yahan hoon — menu, price, ya order ke liye likhein.",
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
