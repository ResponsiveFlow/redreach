"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { SETTING_LIMITS, localToEpoch, type SettingKey } from "@/lib/admin-config";
import { getDict } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isZone } from "@/lib/zones";

export type AdminState = { ok: boolean; error?: string } | null;

/** Salva countdown e impostazioni di gioco. Un solo upsert: o passa tutto o niente. */
export async function saveSettingsAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const { t } = await getDict();

  const num = (k: SettingKey): number | null => {
    const raw = String(form.get(k) ?? "").trim().replace(",", ".");
    const n = Number(raw);
    const { min, max } = SETTING_LIMITS[k];
    return raw !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const int = (k: SettingKey) => {
    const n = num(k);
    return n !== null && Number.isInteger(n) ? n : null;
  };

  const cols = int("sector_cols");
  const rows = int("sector_rows");
  const pct = num("sector_fill_pct");
  const hold = int("hold_minutes");
  const dMin = int("deposits_min");
  const dMax = int("deposits_max");
  if (cols === null || rows === null || pct === null || hold === null || dMin === null || dMax === null) {
    return { ok: false, error: t.admin.errInvalid };
  }
  if (dMin > dMax) return { ok: false, error: t.admin.errDeposits };

  const enabled = form.get("countdown_enabled") === "on";
  const at = localToEpoch(String(form.get("countdown_at") ?? ""));
  if (enabled && at === null) return { ok: false, error: t.admin.errDate };

  const rowsToSave: { key: string; value: number }[] = [
    { key: "sector_cols", value: cols },
    { key: "sector_rows", value: rows },
    { key: "sector_fill_threshold", value: Math.round(pct) / 100 },
    { key: "hold_minutes", value: hold },
    { key: "deposits_min", value: dMin },
    { key: "deposits_max", value: dMax },
    { key: "countdown_enabled", value: enabled ? 1 : 0 },
  ];
  // La data si aggiorna solo se valida: spegnendo il countdown si conserva quella precedente.
  if (at !== null) rowsToSave.push({ key: "countdown_at", value: at });

  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("app_config")
    .upsert(rowsToSave.map((r) => ({ ...r, updated_at: now })), { onConflict: "key" });
  if (error) return { ok: false, error: t.admin.errSave };

  revalidatePath("/admin");
  return { ok: true };
}

/** Apre manualmente un nuovo settore in una zona. */
export async function openSectorAction(zone: string): Promise<{ error?: string }> {
  await requireAdmin();
  const { t } = await getDict();
  if (!isZone(zone)) return { error: t.admin.errInvalid };
  const { error } = await createAdminClient().rpc("admin_open_sector", { p_zone: zone });
  if (error) return { error: t.admin.errSave };
  revalidatePath("/admin");
  return {};
}

/** Apre o chiude un settore. Non si può chiudere l'ultimo settore aperto di una zona. */
export async function setSectorOpenAction(id: number, open: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  const { t } = await getDict();
  const db = createAdminClient();
  const { data: sector } = await db.from("sectors").select("id, zone").eq("id", id).maybeSingle();
  if (!sector) return { error: t.admin.errInvalid };
  if (!open) {
    const { count } = await db
      .from("sectors")
      .select("id", { count: "exact", head: true })
      .eq("zone", sector.zone)
      .eq("is_open", true)
      .neq("id", id);
    if (!count) return { error: t.admin.errLastSector };
  }
  const { error } = await db.from("sectors").update({ is_open: open }).eq("id", id);
  if (error) return { error: t.admin.errSave };
  revalidatePath("/admin");
  return {};
}
