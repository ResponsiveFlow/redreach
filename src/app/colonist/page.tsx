import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { InviteBox } from "@/components/InviteBox";
import { NeighborMap } from "@/components/NeighborMap";
import { Shell } from "@/components/Shell";
import { ShareCard } from "@/components/ShareCard";
import { SocialForm } from "@/components/SocialForm";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/server";
import { NEIGHBOR_RADIUS, hexDistance, type Deposit } from "@/lib/hex";
import { getSectorState } from "@/lib/map-data";
import { getSession } from "@/lib/session";
import { createPublicClient } from "@/lib/supabase/public";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playredreach.com";

async function Content() {
  const [{ t }, { supabase, user, colonist }] = await Promise.all([getDict(), getSession()]);
  if (!user) redirect("/login?next=/colonist");
  if (!colonist) redirect("/zone");

  const db = createPublicClient();
  const [{ data: sector }, state, { data: invited }] = await Promise.all([
    db.from("sectors").select("id, index, cols, rows, deposits").eq("id", colonist.sector_id).single(),
    getSectorState(db, colonist.sector_id),
    supabase.rpc("my_invite_count"),
  ]);
  if (!sector) redirect("/zone");

  const deposits = (sector.deposits ?? []) as Deposit[];
  const me = { q: colonist.q, r: colonist.r };
  // Solo i vicini vicini: bastano per il quartiere e per la carta.
  const neighbors = state.taken.filter(
    (s) =>
      !(s.q === me.q && s.r === me.r) &&
      hexDistance(me.q, me.r, s.q, s.r) <= NEIGHBOR_RADIUS,
  );
  const held = state.held.filter((s) => hexDistance(me.q, me.r, s.q, s.r) <= NEIGHBOR_RADIUS);

  const zoneName = t.zones[colonist.zone].name;
  const inviteUrl = `${SITE}/r/${colonist.ref_code}?lang=${colonist.lang}`;
  const cardNeighbors = neighbors.map((s) => ({
    q: s.q,
    r: s.r,
    label: s.name ?? `#${s.n}`,
  }));

  return (
    <Shell
      zone={colonist.zone}
      title={fmt(t.colonist.title, { n: colonist.colonist_number })}
      subtitle={fmt(t.colonist.line, { zone: zoneName, q: colonist.q, r: colonist.r })}
    >
      {colonist.colonist_name && (
        <p className="-mt-2 font-display text-2xl" style={{ color: "var(--c)" }}>
          {fmt(t.colonist.named, { name: colonist.colonist_name })}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-radar">
          {t.colonist.neighborsTitle}
        </h2>
        <NeighborMap
          me={me}
          cols={sector.cols}
          rows={sector.rows}
          deposits={deposits}
          neighbors={neighbors}
          held={held}
        />
        {neighbors.length === 0 && <p className="text-sm opacity-70">{t.colonist.neighborsHint}</p>}
        <Link
          href={`/zone/${colonist.zone}?sector=${colonist.sector_id}&focus=${colonist.q}-${colonist.r}`}
          className="text-sm underline"
        >
          {t.colonist.openMap}
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">{t.colonist.inviteTitle}</h2>
        <InviteBox url={inviteUrl} invited={invited ?? 0} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">{t.colonist.socialTitle}</h2>
        <SocialForm ig={colonist.ig_username} tiktok={colonist.tiktok_username} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">{t.colonist.cardTitle}</h2>
        <p className="text-sm opacity-80">{t.colonist.cardText}</p>
        <ShareCard
          number={colonist.colonist_number}
          name={colonist.colonist_name}
          zone={colonist.zone}
          q={colonist.q}
          r={colonist.r}
          cols={sector.cols}
          rows={sector.rows}
          deposits={deposits}
          neighbors={cardNeighbors}
          inviteUrl={inviteUrl}
        />
      </section>
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
