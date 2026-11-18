/** Cookie del blocco slot e della sessione anonima (il browser li crea, il server li legge). */
export const SID_COOKIE = "rr_sid";
export const HOLD_COOKIE = "rr_hold";

export type Hold = { z: string; s: number; q: number; r: number; exp: number };

export function parseHold(value: string | undefined): Hold | null {
  if (!value) return null;
  try {
    const raw = value.startsWith("%") ? decodeURIComponent(value) : value;
    const h = JSON.parse(raw) as Partial<Hold>;
    if (
      typeof h.z === "string" &&
      Number.isInteger(h.s) &&
      Number.isInteger(h.q) &&
      Number.isInteger(h.r) &&
      typeof h.exp === "number"
    ) {
      return h as Hold;
    }
  } catch {}
  return null;
}

/** Minuti di blocco (deve coincidere con `hold_minutes` nel database). */
export const HOLD_MINUTES = 5;
