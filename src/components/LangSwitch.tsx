"use client";

import { LANGS } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

/** Cambia lingua con ?lang=xx (il proxy salva la scelta nel cookie). */
export function LangSwitch() {
  const { lang } = useI18n();
  return (
    <nav aria-label="Language" className="flex gap-2 text-xs font-bold uppercase tracking-widest">
      {LANGS.map((l) => (
        <a
          key={l}
          href={`?lang=${l}`}
          hrefLang={l}
          aria-current={l === lang ? "true" : undefined}
          className={l === lang ? "text-radar" : "opacity-60 hover:opacity-100"}
        >
          {l}
        </a>
      ))}
    </nav>
  );
}
