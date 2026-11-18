"use client";

import { useSyncExternalStore } from "react";

// Un solo orologio condiviso, aggiornato ogni secondo solo finché c'è almeno un componente montato.
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

/** Ora corrente in ms, aggiornata ogni secondo. 0 sul server e prima dell'idratazione. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => snap, () => 0);
}
