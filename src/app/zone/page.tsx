import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { ClaimingLive } from "@/components/ClaimingLive";
import { getClaimingCount, getZoneStats } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { TRACK_COOKIE, parseTrackingCookie } from "@/lib/tracking";

async function Content() {
  const [{ lang, t }, stats, jar, claiming] = await Promise.all([
    getDict(),
    getZoneStats(),
    cookies(),
    getClaimingCount(),
  ]);
  const pre = parseTrackingCookie(jar.get(TRACK_COOKIE)?.value)?.pre ?? null;
  const locale = lang === "it" ? "it-IT" : "en-US";
  return (
    <Shell step={1} title={t.zonePage.title} subtitle={t.zonePage.subtitle}>
      <ClaimingLive initial={claiming} />
      <ul className="flex flex-col gap-3">
        {stats.map((s) => (
          <li key={s.zone} data-zone={s.zone}>
            <Link
              href={`/zone/${s.zone}`}
              className="poly flex flex-col gap-2 bg-white/5 p-4 transition hover:bg-white/10"
              style={{ borderLeft: "6px solid var(--c)" }}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display text-2xl uppercase" style={{ color: "var(--c)" }}>
                  {t.zones[s.zone].name}
                </span>
                <span className="text-right text-xs uppercase tracking-wider opacity-70">
                  <b className="font-display text-xl">{s.colonists.toLocaleString(locale)}</b>{" "}
                  {t.common.colonists}
                </span>
              </span>
              <span className="text-sm opacity-80">{t.zones[s.zone].tagline}</span>
              <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span style={{ color: "var(--c)" }}>{t.zonePage.enter}</span>
                {pre === s.zone && <span className="text-radar">{t.zonePage.suggested}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
