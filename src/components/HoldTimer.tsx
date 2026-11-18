"use client";

import Link from "next/link";
import { fmt } from "@/lib/i18n";
import { useNow } from "@/lib/clock";
import { useHold } from "@/lib/hold-client";
import { useI18n } from "@/lib/i18n/client";

/** Conto alla rovescia del blocco slot. Non mostra nulla sul server né a blocco scaduto. */
export function HoldTimer({ exp: initialExp, zone }: { exp: number; zone: string }) {
  const { t } = useI18n();
  // Dopo il rinnovo il cookie ha una nuova scadenza: il timer la segue.
  const exp = useHold()?.exp ?? initialExp;
  const now = useNow();
  const left = Math.floor((exp - now) / 1000);
  if (!now) return null;
  if (left <= 0) {
    return (
      <div className="flex flex-col gap-3 bg-white/10 p-3 text-sm">
        <p>{t.join.holdExpired}</p>
        <Link href={`/zone/${zone}`} className="btn btn-ghost">
          {t.join.pickAnother}
        </Link>
      </div>
    );
  }
  const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <p className="self-start bg-mars-4 px-3 py-1 text-xs font-bold uppercase tracking-wider">
      {fmt(t.join.holdLeft, { time })}
    </p>
  );
}
