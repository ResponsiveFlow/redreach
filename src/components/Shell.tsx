import Link from "next/link";
import { LangSwitch } from "@/components/LangSwitch";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/server";
import type { Zone } from "@/lib/zones";

/** Cornice delle pagine del flusso: wordmark, lingua, avanzamento, colore della zona. */
export async function Shell({
  step,
  zone,
  title,
  subtitle,
  children,
}: {
  step?: 1 | 2 | 3 | 4;
  zone?: Zone;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const { t } = await getDict();
  const steps = t.shell.steps;
  return (
    <main
      data-zone={zone}
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-5"
    >
      <header className="flex items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-tight text-mars">
          {t.common.brand}
        </Link>
        <LangSwitch />
      </header>
      {step && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-widest opacity-70">
            {fmt(t.shell.stepOf, { n: step, total: steps.length, label: steps[step - 1] })}
          </span>
          <div className="flex gap-1" aria-hidden>
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1"
                style={{
                  background:
                    i < step
                      ? "var(--c, var(--mars))"
                      : "color-mix(in srgb, var(--foreground) 20%, transparent)",
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl leading-[1.05]">{title}</h1>
        {subtitle && <p className="text-base opacity-80">{subtitle}</p>}
      </div>
      {children}
    </main>
  );
}
