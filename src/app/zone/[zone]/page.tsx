import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { HexMap } from "@/components/HexMap";
import { MarsOverlay } from "@/components/MarsOverlay";
import { Shell } from "@/components/Shell";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/server";
import { getOpenSectors, getSectorState } from "@/lib/map-data";
import { getSession } from "@/lib/session";
import { createPublicClient } from "@/lib/supabase/public";
import { isZone } from "@/lib/zones";

async function Content({ props }: { props: PageProps<"/zone/[zone]"> }) {
  const [{ zone }, sp, { t }] = await Promise.all([props.params, props.searchParams, getDict()]);
  if (!isZone(zone)) notFound();

  const { colonist } = await getSession();
  if (colonist) redirect("/colonist");

  const db = createPublicClient();
  const sectors = await getOpenSectors(db, zone);
  const wanted = Number(Array.isArray(sp.sector) ? sp.sector[0] : sp.sector);
  const active = sectors.find((s) => s.id === wanted) ?? sectors.at(-1);
  if (!active) notFound();
  const { taken, held } = await getSectorState(db, active.id);

  // ?focus=q-r centra la mappa su uno slot (es. quello di chi ti ha invitato)
  const f = String(Array.isArray(sp.focus) ? sp.focus[0] : (sp.focus ?? "")).match(/^(\d+)-(\d+)$/);
  const focus = f ? { q: Number(f[1]), r: Number(f[2]) } : null;

  return (
    <Shell
      step={2}
      zone={zone}
      title={fmt(t.map.title, { zone: t.zones[zone].name })}
    >
      {sp.e === "taken" && (
        <p role="alert" className="text-sm font-bold text-orange">
          {t.map.errTaken}
        </p>
      )}
      {sectors.length > 1 && (
        <nav className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
          {sectors.map((s) => (
            <Link
              key={s.id}
              href={`/zone/${zone}?sector=${s.id}`}
              className={`px-3 py-1.5 ${s.id === active.id ? "bg-[var(--c)] text-[var(--on)]" : "bg-white/10"}`}
            >
              {fmt(t.map.sector, { n: s.index })}
            </Link>
          ))}
        </nav>
      )}
      <MarsOverlay currentSectorId={active.id} />
      <HexMap
        key={active.id}
        zone={zone}
        sector={active}
        initialTaken={taken}
        initialHeld={held}
        focus={focus}
      />
    </Shell>
  );
}

export default function Page(props: PageProps<"/zone/[zone]">) {
  return (
    <Suspense>
      <Content props={props} />
    </Suspense>
  );
}
