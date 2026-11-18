"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";

const clean = (v: string) => v.replace(/^@/, "").toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 30);

/** Username Instagram/TikTok facoltativi. Già compilato se arrivava dal link di ManyChat. */
export function SocialForm({ ig, tiktok }: { ig: string | null; tiktok: string | null }) {
  const { t } = useI18n();
  const [supabase] = useState(() => createClient());
  const [igValue, setIg] = useState(ig ?? "");
  const [ttValue, setTt] = useState(tiktok ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "invalid">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const { error } = await supabase.rpc("set_social_handles", { p_ig: igValue, p_tiktok: ttValue });
    if (!error) setStatus("saved");
    else setStatus(error.message.includes("invalid_handle") ? "invalid" : "error");
  }

  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider opacity-90">
      {label}
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-60">@</span>
        <input
          className="field pl-9 normal-case tracking-normal"
          value={value}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={31}
          onChange={(e) => {
            set(clean(e.target.value));
            setStatus("idle");
          }}
        />
      </span>
    </label>
  );

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <p className="text-sm opacity-80">{t.colonist.socialText}</p>
      {field(t.colonist.socialIg, igValue, setIg)}
      {field(t.colonist.socialTt, ttValue, setTt)}
      {status === "invalid" && (
        <p role="alert" className="text-sm font-bold text-orange">
          {t.colonist.socialError}
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="text-sm font-bold text-orange">
          {t.colonist.socialErrorGeneric}
        </p>
      )}
      <button className="btn btn-ghost" disabled={status === "saving"}>
        {status === "saving" ? t.colonist.socialSaving : status === "saved" ? t.colonist.socialSaved : t.colonist.socialSave}
      </button>
    </form>
  );
}
