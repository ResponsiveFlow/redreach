"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useNow } from "@/lib/clock";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { clearHoldCookie, sessionId, useHold } from "@/lib/hold-client";
import { createClient } from "@/lib/supabase/client";
import { isZone } from "@/lib/zones";

/**
 * Banner in cima a tutte le pagine finché hai uno slot bloccato: puoi completare la
 * registrazione o rilasciarlo subito (senza dover aspettare che scada).
 */
export function HoldBanner() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const hold = useHold();
  const now = useNow();
  const [busy, setBusy] = useState(false);

  // Nella pagina di registrazione lo slot e il timer sono già in evidenza.
  if (!hold || pathname === "/join") return null;

  const left = Math.max(0, Math.floor((hold.exp - now) / 1000));
  const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const zoneName = isZone(hold.z) ? t.zones[hold.z].name : "";

  async function release() {
    if (busy) return;
    setBusy(true);
    await supabase.rpc("release_slot", { p_session: sessionId() });
    clearHoldCookie();
    setBusy(false);
    router.refresh();
  }

  return (
    <div role="status" className="mx-auto w-full max-w-md px-4 pt-3">
      <div className="poly flex items-center gap-2 border-l-4 border-radar bg-radar/15 p-2 pl-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase leading-tight tracking-wider text-radar">
            {t.holdBanner.label} · {time}
          </p>
          <p className="truncate font-display text-base leading-tight">
            {fmt(t.holdBanner.slot, { zone: zoneName, q: hold.q, r: hold.r })}
          </p>
        </div>
        <Link
          href="/join"
          className="poly flex min-h-10 items-center justify-center bg-radar px-3 font-display text-xs uppercase text-background"
        >
          {t.holdBanner.complete}
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => void release()}
          className="poly min-h-10 bg-white/10 px-3 font-display text-xs uppercase"
        >
          {t.holdBanner.release}
        </button>
      </div>
    </div>
  );
}
