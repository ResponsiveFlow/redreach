import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Deposit } from "./hex";

export type SectorInfo = { id: number; index: number; cols: number; rows: number; deposits: Deposit[] };
export type TakenSlot = { q: number; r: number; n: number; name: string | null };
export type HeldSlot = { q: number; r: number };

type Client = SupabaseClient<Database>;

/** Settori aperti di una zona, dal più vecchio al più recente. */
export async function getOpenSectors(db: Client, zone: string): Promise<SectorInfo[]> {
  const { data } = await db
    .from("sectors")
    .select("id, index, cols, rows, deposits")
    .eq("zone", zone as Database["public"]["Enums"]["zone_t"])
    .eq("is_open", true)
    .order("index");
  return (data ?? []).map((s) => ({ ...s, deposits: (s.deposits ?? []) as Deposit[] }));
}

/** Solo gli slot bloccati in questo momento (poche righe: si può chiedere spesso). */
export async function getHeld(db: Client, sectorId: number): Promise<HeldSlot[]> {
  const { data } = await db.from("public_holds").select("q, r").eq("sector_id", sectorId);
  return (data ?? []).map((h) => ({ q: h.q!, r: h.r! }));
}

/** Slot occupati e bloccati di un settore. PostgREST taglia a 1000 righe: si pagina. */
export async function getSectorState(
  db: Client,
  sectorId: number,
): Promise<{ taken: TakenSlot[]; held: HeldSlot[] }> {
  const taken: TakenSlot[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db
      .from("public_slots")
      .select("q, r, colonist_number, colonist_name")
      .eq("sector_id", sectorId)
      .order("colonist_number")
      .range(from, from + 999);
    for (const s of data ?? []) {
      taken.push({ q: s.q!, r: s.r!, n: Number(s.colonist_number), name: s.colonist_name });
    }
    if (!data || data.length < 1000) break;
  }
  const { data: holds } = await db.from("public_holds").select("q, r").eq("sector_id", sectorId);
  return { taken, held: (holds ?? []).map((h) => ({ q: h.q!, r: h.r! })) };
}
