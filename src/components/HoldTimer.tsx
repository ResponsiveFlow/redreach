"use client";

import { fmt } from "@/lib/i18n";
import { useNow } from "@/lib/clock";
import { useI18n } from "@/lib/i18n/client";

/** Conto alla rovescia del blocco slot. Non mostra nulla sul server né a blocco scaduto. */
export function HoldTimer({ exp }: { exp: number }) {
  const { t } = useI18n();
  const now = useNow();
  const left = Math.floor((exp - now) / 1000);
  if (!now) return null;
  if (left <= 0) {
    return <p className="self-start bg-white/10 px-3 py-2 text-xs">{t.join.holdExpired}</p>;
  }
  const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <p className="self-start bg-mars-4 px-3 py-1 text-xs font-bold uppercase tracking-wider">
      {fmt(t.join.holdLeft, { time })}
    </p>
  );
}
