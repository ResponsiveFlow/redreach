"use client";

import { useState } from "react";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

/** Link d'invito personale "Land next to me": copia e condividi. */
export function InviteBox({ url, invited }: { url: string; invited: number }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard non disponibile (alcune webview): selezioniamo il testo
      const el = document.getElementById("invite-url") as HTMLInputElement | null;
      el?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: t.colonist.inviteTitle, text: t.colonist.inviteShareText, url });
        return;
      } catch {
        // annullato dall'utente: non facciamo nulla
        return;
      }
    }
    void copy();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm opacity-80">{t.colonist.inviteText}</p>
      <input
        id="invite-url"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={t.colonist.inviteTitle}
        className="field text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-ghost" onClick={copy}>
          {copied ? t.colonist.copied : t.colonist.copy}
        </button>
        <button type="button" className="btn" onClick={share}>
          {t.colonist.share}
        </button>
      </div>
      {invited > 0 && (
        <p className="text-xs font-bold uppercase tracking-wider text-radar">
          {fmt(t.colonist.invited, { n: invited })}
        </p>
      )}
    </div>
  );
}
