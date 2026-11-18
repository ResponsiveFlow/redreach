"use client";

import { useNow } from "@/lib/clock";
import { useI18n } from "@/lib/i18n/client";

/** Barra in cima al sito con il conto alla rovescia. Spazio riservato: niente salti di layout. */
export function Countdown({ endsAt }: { endsAt: number }) {
  const { t } = useI18n();
  const now = useNow();
  const left = Math.floor((endsAt - now) / 1000);
  const show = now > 0 && left > 0;

  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const two = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="mx-auto min-h-10 w-full max-w-md px-4 pt-3" role="timer" aria-live="off">
      {show && (
        <div className="poly flex items-center justify-between gap-3 bg-mars-4 px-4 py-2">
          <span className="text-[11px] font-bold uppercase leading-tight tracking-wider">
            {t.countdown.label}
          </span>
          <span className="font-display text-lg tabular-nums leading-none">
            {d}
            {t.countdown.d} {two(h)}
            {t.countdown.h} {two(m)}
            {t.countdown.m} {two(s)}
            {t.countdown.s}
          </span>
        </div>
      )}
    </div>
  );
}
