import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HexMap } from "@/components/HexMap";
import { MarsOverlay } from "@/components/MarsOverlay";
import { Shell } from "@/components/Shell";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/server";
import { getOpenSectors, getSectorState } from "@/lib/map-data";
import { getSession } from "@/lib/session";
import { createPublicClient } from "@/lib/supabase/public";
import { TRACK_COOKIE, parseTrackingCookie } from "@/lib/tracking";
import { isZone } from "@/lib/zones";

async function Content({ props }: { props: PageProps<"/zone/[zone]"> }) {
  const [{ zone }, sp, { t }] = await Promise.all([props.params, props.searchParams, getDict()]);
  if (!isZone(zone)) notFound();

  // Chi ha già uno slot vede la mappa ma non può prenotare.
  const { colonist } = await getSession();

  const db = createPublicClient();
  const sectors = await getOpenSectors(db, zone);
  const wanted = Number(Array.isArray(sp.sector) ? sp.sector[0] : sp.sector);
  const active = sectors.find((s) => s.id === wanted) ?? sectors.at(-1);
  if (!active) notFound();
  const { taken, held } = await getSectorState(db, active.id);

  // ?focus=q-r centra la mappa su uno slot (es. quello di chi ti ha invitato)
  const f = String(Array.isArray(sp.focus) ? sp.focus[0] : (sp.focus ?? "")).match(/^(\d+)-(\d+)$/);
  const mine =
    colonist && colonist.sector_id === active.id ? { q: colonist.q, r: colonist.r } : null;
  let mySlot = null;
  if (colonist) {
    const { data: mySector } = await db.from("sectors").select("index").eq("id", colonist.sector_id).single();
    mySlot = {
      zone: colonist.zone,
      sectorId: colonist.sector_id,
      sectorIndex: mySector?.index ?? 1,
      q: colonist.q,
      r: colonist.r,
    };
  }
  const focus = f ? { q: Number(f[1]), r: Number(f[2]) } : mine;

  // Arrivi dal link di un amico: "Atterra accanto a <nome>".
  let inviter: string | null = null;
  if (!colonist && focus && f) {
    const ref = parseTrackingCookie((await cookies()).get(TRACK_COOKIE)?.value)?.ref;
    if (ref) {
      const { data } = await db.rpc("invite_lookup", { p_ref: ref });
      const row = data?.[0];
      if (row && row.sector_id === active.id && row.q === focus.q && row.r === focus.r) {
        inviter = row.colonist_name ?? fmt(t.map.colonistN, { n: row.colonist_number });
      }
    }
  }

  return (
    <Shell
      step={colonist ? undefined : 2}
      zone={zone}
      title={fmt(colonist ? t.map.viewTitle : t.map.title, { zone: t.zones[zone].name })}
    >
      {inviter && (
        <p className="poly bg-orange/15 p-3 text-sm font-bold text-orange">
          {fmt(t.map.landNext, { name: inviter })}
        </p>
      )}
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
        mine={mine}
        mySlot={mySlot}
        readOnly={!!colonist}
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
