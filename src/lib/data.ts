import { createPublicClient } from "./supabase/public";
import { ZONES, type Zone } from "./zones";

/** Coloni che stanno scegliendo uno slot in questo momento (tutti i settori). */
export async function getClaimingCount(): Promise<number> {
  try {
    const { count } = await createPublicClient()
      .from("public_holds")
      .select("*", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}

// Cache in memoria (per istanza del worker): evita di interrogare il database a ogni visita.
// Nessuna dipendenza dalle Cache Components di Next, non affidabili su Cloudflare Workers.
// Si memorizzano solo valori già pronti, mai promise (non possono passare da una richiesta all'altra).
const memo = new Map<string, { t: number; v: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v as T;
  const v = await load();
  memo.set(key, { t: Date.now(), v });
  return v;
}

export type ZoneStat = { zone: Zone; colonists: number };

/**
 * Coloni per zona (view `zone_stats`, creata nelle migrazioni del punto 3).
 * In cache 30 secondi: regge i picchi da social. Se la view non c'è ancora, zero.
 */
export async function getZoneStats(): Promise<ZoneStat[]> {
  return cached("zone_stats", 30_000, loadZoneStats);
}

async function loadZoneStats(): Promise<ZoneStat[]> {
  try {
    const { data, error } = await createPublicClient().from("zone_stats").select("zone, colonists");
    if (error || !data) throw error;
    return ZONES.map((z) => ({
      zone: z,
      colonists: Number(data.find((x) => x.zone === z)?.colonists ?? 0),
    }));
  } catch {
    return ZONES.map((z) => ({ zone: z, colonists: 0 }));
  }
}

/**
 * Countdown "apertura gioco" (si imposta da /admin). Null se spento o non configurato.
 * In cache 60 secondi: una modifica dall'admin arriva a tutti entro un minuto.
 */
export async function getCountdown(): Promise<number | null> {
  return cached("countdown", 60_000, loadCountdown);
}

async function loadCountdown(): Promise<number | null> {
  try {
    const { data } = await createPublicClient()
      .from("site_countdown")
      .select("ends_at, enabled")
      .maybeSingle();
    if (!data?.enabled || !data.ends_at) return null;
    const ms = new Date(data.ends_at).getTime();
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}
