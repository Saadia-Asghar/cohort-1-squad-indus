/** Shared Sweet Tooth field styling so forms look the same on every screen. */
export const brandFieldClass =
  "min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10";

export const brandGhostButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted";

export const brandPrimaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50";

/** Chart / PDF hex values — same plum, pink, gold as CSS tokens. */
export const BRAND_HEX = {
  cream: "#FBF6EE",
  plum: "#632A73",
  pink: "#C24F7A",
  gold: "#C99855",
  ink: "#241629",
} as const;
