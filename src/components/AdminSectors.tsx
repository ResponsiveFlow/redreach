"use client";

import { useState, useTransition } from "react";
import { openSectorAction, setSectorOpenAction } from "@/app/admin/actions";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import type { Zone } from "@/lib/zones";

export type SectorRow = { id: number; zone: Zone; index: number; isOpen: boolean; taken: number };

/** Settori per zona: stato, riempimento, apertura/chiusura e apertura manuale di uno nuovo. */
export function AdminSectors({ zones }: { zones: { zone: Zone; sectors: SectorRow[] }[] }) {
  const { t } = useI18n();
  const a = t.admin;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => setError((await fn()).error ?? null));

  return (
    <div className="flex flex-col gap-6">
      {zones.map(({ zone, sectors }) => (
        <div key={zone} data-zone={zone} className="flex flex-col gap-2">
          <h3 className="font-display text-lg" style={{ color: "var(--c)" }}>
            {t.zones[zone].name}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {sectors.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 bg-foreground/10 px-3 py-2 text-sm"
              >
                <span>
                  <b>{fmt(a.sectorN, { n: s.index })}</b>
                  <span className="opacity-70"> · {fmt(a.sectorTaken, { n: s.taken })}</span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setSectorOpenAction(s.id, !s.isOpen))}
                  className={`min-h-9 px-3 text-xs font-bold uppercase tracking-wider disabled:opacity-40 ${
                    s.isOpen ? "bg-radar text-background" : "bg-foreground/15"
                  }`}
                >
                  {s.isOpen ? a.sectorOpen : a.sectorClosed}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={() => run(() => openSectorAction(zone))}
          >
            {fmt(a.openNew, { zone: t.zones[zone].name })}
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm font-bold text-orange">
          {error}
        </p>
      )}
    </div>
  );
}
