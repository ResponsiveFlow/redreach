export const ZONES = ["ice", "metal", "sun"] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_COOKIE = "rr_zone";

export function isZone(v: unknown): v is Zone {
  return typeof v === "string" && (ZONES as readonly string[]).includes(v);
}
