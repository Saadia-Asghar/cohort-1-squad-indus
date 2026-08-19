export const HOME_SECTION_IDS = ["how-it-works", "features", "pricing", "faq"] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export function sectionIdFromHref(href: string): HomeSectionId | null {
  const hash = href.includes("#") ? href.slice(href.indexOf("#") + 1).split("?")[0] : "";
  return (HOME_SECTION_IDS as readonly string[]).includes(hash) ? (hash as HomeSectionId) : null;
}

export function scrollToHomeSection(id: string): boolean {
  const element = document.getElementById(id);
  if (!element) return false;
  element.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

export function goToHomeSection(id: string, options?: { delayMs?: number }): void {
  const hash = `#${id}`;
  const onHome = window.location.pathname === "/" || window.location.pathname === "";
  if (!onHome) {
    window.location.assign(`/${hash}`);
    return;
  }

  if (window.location.hash !== hash) {
    window.history.pushState(null, "", `/${hash}`);
  }

  const run = () => {
    scrollToHomeSection(id);
  };
  const delay = options?.delayMs ?? 0;
  if (delay > 0) {
    window.setTimeout(run, delay);
    return;
  }
  window.requestAnimationFrame(run);
}
