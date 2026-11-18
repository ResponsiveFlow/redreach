/** Impostazioni di gioco modificabili da /admin (righe di `app_config`). */

export const ADMIN_TZ = "Europe/Rome";

export type SettingKey =
  | "sector_cols"
  | "sector_rows"
  | "sector_fill_pct"
  | "hold_minutes"
  | "deposits_min"
  | "deposits_max";

/** Limiti validi per ogni campo (il DB accetta 5-200 per cols/rows, ma sotto 12 i giacimenti non hanno spazio). */
export const SETTING_LIMITS: Record<SettingKey, { min: number; max: number }> = {
  sector_cols: { min: 12, max: 200 },
  sector_rows: { min: 12, max: 200 },
  sector_fill_pct: { min: 1, max: 100 },
  hold_minutes: { min: 1, max: 60 },
  deposits_min: { min: 1, max: 3 },
  deposits_max: { min: 1, max: 3 },
};

/** Differenza (ms) tra l'ora locale di `tz` e UTC in quell'istante. */
function tzOffsetMs(epochMs: number, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(epochMs))
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(epochMs / 1000) * 1000;
}

/** "2026-11-25T00:00" (ora di Roma) → epoch in secondi. Null se non valido. */
export function localToEpoch(local: string, tz = ADMIN_TZ): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let ms = guess - tzOffsetMs(guess, tz);
  ms = guess - tzOffsetMs(ms, tz); // secondo passaggio: vicino al cambio ora legale
  return Number.isFinite(ms) ? Math.round(ms / 1000) : null;
}

/** Epoch in secondi → "YYYY-MM-DDTHH:mm" in ora di Roma (per <input type="datetime-local">). */
export function epochToLocal(epochSec: number, tz = ADMIN_TZ): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(epochSec * 1000))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
