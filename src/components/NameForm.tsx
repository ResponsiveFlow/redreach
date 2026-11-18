"use client";

import { useState, useTransition } from "react";
import { registerAction } from "@/app/actions";
import { useI18n } from "@/lib/i18n/client";

/** Ultimo passo: nome da colono (facoltativo) e conferma dello slot. */
export function NameForm() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(value: string | null) {
    setError(null);
    start(async () => {
      const res = await registerAction(value);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(name);
      }}
    >
      <div className="flex flex-col gap-2">
        <input
          className="field"
          autoComplete="nickname"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          placeholder={t.join.namePlaceholder}
          aria-label={t.join.nameLabel}
          value={name}
          disabled={pending}
          onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9_.-]/g, ""))}
        />
        <p className="text-xs opacity-70">{t.join.nameHint}</p>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-orange">
          {error}
        </p>
      )}
      <button className="btn" disabled={pending || name.length < 3}>
        {pending ? t.join.claiming : t.join.claim}
      </button>
      <button
        type="button"
        className="text-sm underline"
        disabled={pending}
        onClick={() => submit(null)}
      >
        {t.join.skip}
      </button>
    </form>
  );
}
