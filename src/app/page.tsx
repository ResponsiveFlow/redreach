import Link from "next/link";
import { Suspense } from "react";
import { LangSwitch } from "@/components/LangSwitch";
import { VisitLogger } from "@/components/VisitLogger";
import { getZoneStats } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";

async function Counters() {
  const [stats, { lang, t }] = await Promise.all([getZoneStats(), getDict()]);
  const locale = lang === "it" ? "it-IT" : "en-US";
  return (
    <ul className="flex flex-col gap-3">
      {stats.map((s) => (
        <li key={s.zone} data-zone={s.zone}>
          <Link
            href={`/zone/${s.zone}`}
            className="poly flex items-center justify-between gap-3 bg-white/5 p-4 transition hover:bg-white/10 active:bg-white/15"
            style={{ borderLeft: "6px solid var(--c)" }}
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-display text-2xl uppercase" style={{ color: "var(--c)" }}>
                {t.zones[s.zone].name}
              </span>
              <span className="text-xs opacity-70">{t.zones[s.zone].tagline}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-right">
                <span className="block font-display text-3xl leading-none">
                  {s.colonists.toLocaleString(locale)}
                </span>
                <span className="block text-[11px] uppercase tracking-wider opacity-70">
                  {t.common.colonists}
                </span>
              </span>
              <span className="font-display text-2xl" style={{ color: "var(--c)" }} aria-hidden="true">
                →
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CountersFallback() {
  return (
    <ul className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="poly h-[72px] bg-white/5" />
      ))}
    </ul>
  );
}

async function Content() {
  const { t } = await getDict();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-7 px-4 pb-10 pt-5">
      <header className="flex items-center justify-between">
        <span className="font-display text-xl tracking-tight text-mars">{t.common.brand}</span>
        <LangSwitch />
      </header>

      <h1 className="font-display text-[2.4rem] leading-[1.05]">{t.home.hook}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-radar">
          {t.home.liveCounter}
        </h2>
        <Suspense fallback={<CountersFallback />}>
          <Counters />
        </Suspense>
      </section>

      <div className="flex flex-col gap-3">
        <Link href="/zone" className="btn">
          {t.home.cta}
        </Link>
        <p className="text-center text-xs opacity-70">{t.home.note}</p>
      </div>

      <VisitLogger />

      <footer className="mt-auto text-center text-xs opacity-60">
        <Link href="/privacy" className="underline">
          {t.common.privacy}
        </Link>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
