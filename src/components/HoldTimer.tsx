"use client";

import { useSyncExternalStore } from "react";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

// Un solo orologio condiviso, aggiornato ogni secondo solo se c'è un timer montato.
let snap = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const subs = new Set<() => void>();
const tick = () => {
  snap = Date.now();
  subs.forEach((f) => f());
};
function subscribe(cb: () => void) {
  subs.add(cb);
  if (!timer) {
    tick();
    timer = setInterval(tick, 1000);
  }
  return () => {
    subs.delete(cb);
    if (!subs.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Conto alla rovescia del blocco slot. Non mostra nulla sul server né a blocco scaduto. */
export function HoldTimer({ exp }: { exp: number }) {
  const { t } = useI18n();
  const now = useSyncExternalStore(subscribe, () => snap, () => 0);
  const left = Math.floor((exp - now) / 1000);
  if (!now || left <= 0) return null;
  const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <p className="self-start bg-mars-4 px-3 py-1 text-xs font-bold uppercase tracking-wider">
      {fmt(t.join.holdLeft, { time })}
    </p>
  );
}
