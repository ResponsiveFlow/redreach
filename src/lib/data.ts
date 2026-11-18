import { cacheLife } from "next/cache";
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

export type ZoneStat = { zone: Zone; colonists: number };

/**
 * Coloni per zona (view `zone_stats`, creata nelle migrazioni del punto 3).
 * Cache di 30 secondi: regge i picchi da social. Se la view non c'è ancora, zero.
 */
export async function getZoneStats(): Promise<ZoneStat[]> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 600 });
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
