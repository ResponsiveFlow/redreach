"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const KEY = "rr_cookie_ok";

function seen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Avviso minimo: usiamo solo cookie tecnici. */
export function CookieNotice() {
  const { t } = useI18n();
  const [closed, setClosed] = useState(false);
  // null sul server e durante l'idratazione: l'avviso non compare mai nell'HTML iniziale.
  const already = useSyncExternalStore(
    () => () => {},
    seen,
    () => null,
  );
  if (closed || already !== false) return null;

  return (
    <div
      role="region"
      className="mx-auto flex w-full max-w-md items-center gap-3 bg-mars-4 p-3 text-xs"
    >
      <p className="flex-1">
        {t.cookies.text}{" "}
        <Link href="/privacy" className="underline">
          {t.common.privacy}
        </Link>
      </p>
      <button
        className="min-h-10 bg-mars px-4 font-display text-sm uppercase text-white"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
          setClosed(true);
        }}
      >
        {t.cookies.ok}
      </button>
    </div>
  );
}
