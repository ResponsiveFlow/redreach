"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RENEW_KEY, clearHoldCookie, readHold, saveHoldCookie, sessionId } from "@/lib/hold-client";

const RENEW_WINDOW_MS = 15 * 60 * 1000;

/**
 * Rinnova il blocco dello slot UNA volta, subito dopo che l'utente ha verificato l'account
 * (codice, password o Google). Non rinnova se si ricarica la pagina: niente blocchi infiniti.
 */
export function HoldRenew() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    let flag = 0;
    try {
      flag = Number(localStorage.getItem(RENEW_KEY));
      localStorage.removeItem(RENEW_KEY);
    } catch {}
    if (!flag || Date.now() - flag > RENEW_WINDOW_MS) return;
    const hold = readHold();
    if (!hold) return;
    started.current = true;

    supabase
      .rpc("hold_slot", { p_session: sessionId(), p_sector: hold.s, p_q: hold.q, p_r: hold.r })
      .then(({ data, error }) => {
        if (!error && data) {
          saveHoldCookie({ ...hold, exp: new Date(data).getTime() });
        } else if (error?.message.includes("slot_taken") || error?.message.includes("slot_invalid")) {
          // Nel frattempo lo slot è andato a un altro: meglio dirlo subito che dopo il nome.
          clearHoldCookie();
          router.replace(`/zone/${hold.z}?e=taken`);
        }
      });
  }, [supabase, router]);

  return null;
}
