import { fmt } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/en";
import { ZONES } from "@/lib/zones";

export type Stats = {
  colonists: number;
  visitors: number;
  invited_total: number;
  by_day: { day: string; signups: number; visits: number }[];
  by_zone: Record<string, number>;
  by_lang: Record<string, number>;
  by_source: { source: string; visitors: number; colonists: number }[];
  top_inviters: { number: number; name: string | null; invited: number }[];
};

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "–");

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="font-display text-2xl">{value}</div>
      <div className="text-xs text-sand/70">{label}</div>
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-radar">{children}</h3>;
}

/** Metriche in sola lettura: solo tabelle, nessun grafico (la pagina resta leggera). */
export function AdminStats({ stats, t }: { stats: Stats; t: Dict }) {
  const a = t.admin;
  const days = stats.by_day.slice(0, 14);
  const th = "py-1 text-left font-normal text-sand/60";
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-radar">{a.statsTitle}</h2>
      <div className="grid grid-cols-2 gap-3">
        <Tile label={a.statColonists} value={stats.colonists} />
        <Tile label={a.statVisitors} value={stats.visitors} />
        <Tile label={a.statConversion} value={pct(stats.colonists, stats.visitors)} />
        <Tile label={a.statInvited} value={stats.invited_total} />
      </div>

      <div>
        <Title>{a.bySource}</Title>
        <table className="w-full text-sm">
          <thead><tr><th className={th}>{a.colSource}</th><th className={th}>{a.colVisits}</th><th className={th}>{a.colSignups}</th><th className={th}>{a.colConv}</th></tr></thead>
          <tbody>
            {stats.by_source.map((s) => (
              <tr key={s.source} className="border-t border-white/5">
                <td className="py-1">{a.sourceNames[s.source as keyof typeof a.sourceNames] ?? s.source}</td>
                <td>{s.visitors}</td><td>{s.colonists}</td><td>{pct(s.colonists, s.visitors)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Title>{a.byZone}</Title>
          <ul className="text-sm">
            {ZONES.map((z) => (
              <li key={z} data-zone={z} className="flex justify-between border-t border-white/5 py-1">
                <span style={{ color: "var(--c)" }}>{t.zones[z].name}</span><span>{stats.by_zone[z] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Title>{a.byLang}</Title>
          <ul className="text-sm">
            {(["it", "en"] as const).map((l) => (
              <li key={l} className="flex justify-between border-t border-white/5 py-1">
                <span>{l.toUpperCase()}</span><span>{stats.by_lang[l] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <Title>{a.byDay}</Title>
        <table className="w-full text-sm">
          <thead><tr><th className={th}>{a.colDay}</th><th className={th}>{a.colVisits}</th><th className={th}>{a.colSignups}</th></tr></thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day} className="border-t border-white/5"><td className="py-1">{d.day}</td><td>{d.visits}</td><td>{d.signups}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <Title>{a.topInviters}</Title>
        {stats.top_inviters.length === 0 ? (
          <p className="text-sm text-sand/60">{a.noInviters}</p>
        ) : (
          <ul className="text-sm">
            {stats.top_inviters.map((i) => (
              <li key={i.number} className="flex justify-between border-t border-white/5 py-1">
                <span>{i.name ?? `Colonist #${i.number}`}</span><span>{fmt(a.invited, { n: i.invited })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <a href="/admin/export" className="btn self-start" download>{a.exportCsv}</a>
      <p className="-mt-4 text-xs text-sand/60">{a.exportText}</p>
    </section>
  );
}
