export const BAKERY_QUEST_START_FLAG = "sweet-tooth:start-bakery-quest";

export function markBakeryQuestForNewSignup() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(BAKERY_QUEST_START_FLAG, "1");
}

export function consumeBakeryQuestStartFlag(): boolean {
  if (typeof window === "undefined") return false;
  const shouldStart = window.sessionStorage.getItem(BAKERY_QUEST_START_FLAG) === "1";
  if (shouldStart) {
    window.sessionStorage.removeItem(BAKERY_QUEST_START_FLAG);
  }
  return shouldStart;
}

export function bakeryQuestStorageKey(bakerId: number) {
  return `sweet-tooth:bakery-quest:v1:${bakerId}`;
}
