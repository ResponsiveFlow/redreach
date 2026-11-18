"use client";

import { useSyncExternalStore } from "react";
import { useNow } from "./clock";
import { HOLD_COOKIE, SID_COOKIE, parseHold, type Hold } from "./hold";

/** Evento che avvisa i componenti quando lo slot bloccato dall'utente cambia o viene liberato. */
export const HOLD_EVENT = "rr-hold-change";

const getCookie = (name: string): string => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? m[1] : "";
};

/** Identificativo anonimo del browser (cookie), creato al primo blocco. */
export function sessionId(): string {
  const existing = getCookie(SID_COOKIE);
  if (existing.length >= 16) return existing;
  const id = crypto.randomUUID();
  document.cookie = `${SID_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  return id;
}

export function saveHoldCookie(hold: Hold) {
  document.cookie = `${HOLD_COOKIE}=${encodeURIComponent(JSON.stringify(hold))}; path=/; max-age=86400; samesite=lax`;
  window.dispatchEvent(new Event(HOLD_EVENT));
}

export function clearHoldCookie() {
  document.cookie = `${HOLD_COOKIE}=; path=/; max-age=0; samesite=lax`;
  window.dispatchEvent(new Event(HOLD_EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(HOLD_EVENT, cb);
  const id = setInterval(cb, 2000); // anche se il cookie cambia da un'altra scheda
  return () => {
    window.removeEventListener(HOLD_EVENT, cb);
    clearInterval(id);
  };
}

/** Lo slot che questo browser sta tenendo bloccato adesso (null se non ce n'è o è scaduto). */
export function useHold(): Hold | null {
  const raw = useSyncExternalStore(subscribe, () => getCookie(HOLD_COOKIE), () => "");
  const now = useNow();
  const hold = parseHold(raw || undefined);
  return hold && now > 0 && hold.exp > now ? hold : null;
}
