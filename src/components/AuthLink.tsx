"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";

const CLASS = "text-xs font-bold uppercase tracking-widest underline";

/**
 * "Accedi" se non sei loggato, "Esci" se lo sei. Legge la sessione dal browser (nessuna
 * chiamata al server), quindi non rallenta le pagine.
 */
export function AuthLink() {
  const { t } = useI18n();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Spazio riservato finché non sappiamo: niente salti nell'intestazione.
  if (signedIn === null) return <span className="inline-block h-4 w-12" aria-hidden />;

  if (!signedIn) {
    return (
      <Link href="/login" className={CLASS}>
        {t.login.link}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={CLASS}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await supabase.auth.signOut({ scope: "local" }); // solo questo dispositivo
        setBusy(false);
        router.replace("/");
        router.refresh();
      }}
    >
      {t.login.logout}
    </button>
  );
}
