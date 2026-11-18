import { Suspense } from "react";
import { AdminSectors } from "@/components/AdminSectors";
import { AdminStats, type Stats } from "@/components/AdminStats";
import { AdminSettingsForm, type SettingsValues } from "@/components/AdminSettingsForm";
import { Shell } from "@/components/Shell";
import { requireAdmin } from "@/lib/admin";
import { epochToLocal } from "@/lib/admin-config";
import { getDict } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ZONES } from "@/lib/zones";

export const metadata = { robots: { index: false, follow: false } };

async function Content() {
  await requireAdmin();
  const { t } = await getDict();
  const db = createAdminClient();

  const [{ data: cfgRows }, { data: sectors }] = await Promise.all([
    db.from("app_config").select("key, value"),
    db.from("sectors").select("id, zone, index, is_open").order("index"),
  ]);
  const cfg = Object.fromEntries((cfgRows ?? []).map((r) => [r.key, Number(r.value)]));

  const { data: stats } = await db.rpc("admin_stats");

  const taken = await Promise.all(
    (sectors ?? []).map(async (s) => {
      const { count } = await db
        .from("colonists")
        .select("id", { count: "exact", head: true })
        .eq("sector_id", s.id);
      return count ?? 0;
    }),
  );

  const values: SettingsValues = {
    countdownEnabled: cfg.countdown_enabled === 1,
    countdownAt: cfg.countdown_at ? epochToLocal(cfg.countdown_at) : "",
    sector_cols: cfg.sector_cols ?? 30,
    sector_rows: cfg.sector_rows ?? 40,
    sector_fill_pct: Math.round((cfg.sector_fill_threshold ?? 0.25) * 100),
    hold_minutes: cfg.hold_minutes ?? 5,
    deposits_min: cfg.deposits_min ?? 1,
    deposits_max: cfg.deposits_max ?? 3,
  };

  const zones = ZONES.map((zone) => ({
    zone,
    sectors: (sectors ?? [])
      .map((s, i) => ({ id: s.id, zone: s.zone, index: s.index, isOpen: s.is_open, taken: taken[i] }))
      .filter((s) => s.zone === zone),
  }));

  return (
    <Shell title={t.admin.title} subtitle={t.admin.subtitle}>
      {stats ? <AdminStats stats={stats as unknown as Stats} t={t} /> : null}
      <AdminSettingsForm values={values} />
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-radar">{t.admin.sectorListTitle}</h2>
        <AdminSectors zones={zones} />
      </section>
    </Shell>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
