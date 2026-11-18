"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

const POLL_MS = 6_000;

/** Quanti coloni stanno scegliendo uno slot adesso, in tutti i settori. Si aggiorna da solo. */
export function ClaimingLive({ initial }: { initial: number }) {
  const { t } = useI18n();
  const [supabase] = useState(() => createClient());
  const [n, setN] = useState(initial);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      supabase
        .from("public_holds")
        .select("*", { count: "exact", head: true })
        .then(({ count }) => typeof count === "number" && setN(count));
    }, POLL_MS);
    return () => clearInterval(id);
  }, [supabase]);

  return (
    <div className="min-h-5 text-xs font-bold uppercase tracking-wider text-orange">
      {n > 0 && (
        <p className="flex items-start gap-2">
          <span className="blink mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-orange" />
          {fmt(n === 1 ? t.zonePage.claimingOne : t.zonePage.claimingMany, { n })}
        </p>
      )}
    </div>
  );
}
