export type DeliveryZone = {
  /** Stable local id so the dashboard can edit/remove a zone. */
  id: string;
  name: string;
  feePkr: number;
  minimumOrderPkr?: number;
};

const MAX_ZONES = 30;

export function normalizeDeliveryZones(value: unknown): DeliveryZone[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const zones: DeliveryZone[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
    const feePkr = typeof raw.feePkr === "number" ? raw.feePkr : Number(raw.feePkr);
    const minimum = typeof raw.minimumOrderPkr === "number" ? raw.minimumOrderPkr : Number(raw.minimumOrderPkr);
    const key = name.toLocaleLowerCase();
    if (!name || name.length > 80 || !Number.isInteger(feePkr) || feePkr < 0 || feePkr > 100_000 || seen.has(key)) continue;
    if (Number.isFinite(minimum) && (!Number.isInteger(minimum) || minimum < 0 || minimum > 10_000_000)) continue;
    seen.add(key);
    zones.push({
      id: typeof raw.id === "string" && /^[a-z0-9_-]{1,40}$/i.test(raw.id) ? raw.id : `zone-${zones.length + 1}`,
      name,
      feePkr,
      ...(Number.isFinite(minimum) && minimum > 0 ? { minimumOrderPkr: minimum } : {}),
    });
    if (zones.length === MAX_ZONES) break;
  }
  return zones;
}

export function findDeliveryZone(zones: DeliveryZone[], area?: string | null): DeliveryZone | null {
  const query = area?.trim().toLocaleLowerCase();
  if (!query) return null;
  return zones.find((zone) => zone.name.toLocaleLowerCase() === query)
    ?? zones.find((zone) => query.includes(zone.name.toLocaleLowerCase()) || zone.name.toLocaleLowerCase().includes(query))
    ?? null;
}

export function deliveryZoneSummary(zones: DeliveryZone[]): string {
  return zones
    .map((zone) => `${zone.name}: PKR ${zone.feePkr.toLocaleString()}${zone.minimumOrderPkr ? ` (min order PKR ${zone.minimumOrderPkr.toLocaleString()})` : ""}`)
    .join(" · ");
}
