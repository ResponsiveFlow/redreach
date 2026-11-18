import { isZone, type Zone } from "./zones";

export const TRACK_COOKIE = "rr_track";
export const TRACK_MAX_AGE = 60 * 60 * 24 * 30; // 30 giorni

export type Tracking = {
  src: string; // ig | tt | ref | altro
  ref: string | null; // codice invito
  ig: string | null; // username IG da ManyChat, NON verificato
  pre: Zone | null; // zona preselezionata dal commento, modificabile
};

const SRC_ALLOWED = ["ig", "tt", "ref"];

function clean(v: string | null, max = 40): string | null {
  if (!v) return null;
  const s = v.trim().replace(/^@/, "").slice(0, max);
  return /^[A-Za-z0-9._-]+$/.test(s) ? s : null;
}

/** Legge i parametri d'ingresso dall'URL. Ritorna null se non ce n'è nessuno. */
export function trackingFromParams(p: URLSearchParams): Tracking | null {
  const rawSrc = p.get("src");
  const ref = clean(p.get("ref"), 32);
  const ig = clean(p.get("ig"), 30);
  const pre = p.get("pre")?.toLowerCase() ?? null;

  if (!rawSrc && !ref && !ig && !pre) return null;

  let src = rawSrc?.toLowerCase() ?? (ref ? "ref" : "altro");
  if (!SRC_ALLOWED.includes(src)) src = "altro";

  return { src, ref, ig, pre: isZone(pre) ? pre : null };
}

export function parseTrackingCookie(value: string | undefined): Tracking | null {
  if (!value) return null;
  try {
    // Next decodifica già il valore del cookie; tollera anche il formato codificato.
    const raw = value.startsWith("%") ? decodeURIComponent(value) : value;
    const t = JSON.parse(raw) as Partial<Tracking>;
    return {
      src: typeof t.src === "string" ? t.src : "altro",
      ref: clean(t.ref ?? null, 32),
      ig: clean(t.ig ?? null, 30),
      pre: isZone(t.pre) ? t.pre : null,
    };
  } catch {
    return null;
  }
}

export function serializeTracking(t: Tracking): string {
  return JSON.stringify(t); // la codifica del cookie la fa Next
}
