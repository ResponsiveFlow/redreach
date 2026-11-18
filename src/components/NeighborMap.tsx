import { getDict } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import {
  HEX,
  NEIGHBOR_RADIUS,
  depositDistance,
  hexCenter,
  hexDistance,
  hexPath,
  neighborhood,
  richness,
  type Deposit,
} from "@/lib/hex";
import type { HeldSlot, TakenSlot } from "@/lib/map-data";

const MAX_LISTED = 10;

/**
 * Il tuo slot con i vicini attorno: SVG statico, nessun JavaScript.
 * Sulla mappa i vicini hanno un numero; sotto c'è l'elenco con nome e slot, ben leggibile.
 */
export async function NeighborMap({
  me,
  myName,
  cols,
  rows,
  deposits,
  neighbors,
  held,
}: {
  me: { q: number; r: number };
  /** Nome da mostrare per te (nome colono o "Colonist #N"). */
  myName: string;
  cols: number;
  rows: number;
  deposits: Deposit[];
  neighbors: TakenSlot[];
  held: HeldSlot[];
}) {
  const { t } = await getDict();
  const cells = neighborhood(me.q, me.r, cols, rows);
  const heldSet = new Set(held.map((s) => `${s.q}-${s.r}`));

  // Dal più vicino al più lontano: il numero sulla mappa corrisponde alla riga dell'elenco.
  const listed = [...neighbors]
    .map((s) => ({ ...s, d: hexDistance(me.q, me.r, s.q, s.r) }))
    .sort((a, b) => a.d - b.d || a.n - b.n)
    .slice(0, MAX_LISTED);
  const numberOf = new Map(listed.map((s, i) => [`${s.q}-${s.r}`, i + 1]));
  const takenKeys = new Set(neighbors.map((s) => `${s.q}-${s.r}`));

  const L = { normal: "", good: "", rich: "", held: "", taken: "", deposit: "", poles: "", flags: "" };
  const badges: { x: number; y: number; n: number }[] = [];
  for (const { q, r } of cells) {
    if (q === me.q && r === me.r) continue;
    const key = `${q}-${r}`;
    const d = depositDistance(deposits, q, r);
    const [cx, cy] = hexCenter(q, r);
    if (d === 0) {
      L.deposit += hexPath(q, r, 1);
    } else if (takenKeys.has(key)) {
      L.taken += hexPath(q, r);
      L.poles += `M${(cx - 3).toFixed(1)} ${(cy + 7).toFixed(1)}V${(cy - 8).toFixed(1)}`;
      L.flags += `M${(cx - 3).toFixed(1)} ${(cy - 8).toFixed(1)}L${(cx + 7).toFixed(1)} ${(cy - 4.5).toFixed(1)}L${(cx - 3).toFixed(1)} ${(cy - 1).toFixed(1)}Z`;
      const n = numberOf.get(key);
      if (n) badges.push({ x: cx + 1, y: cy + 11, n });
    } else if (heldSet.has(key)) {
      L.held += hexPath(q, r);
    } else {
      L[richness(d)] += hexPath(q, r);
    }
  }

  const [mx, my] = hexCenter(me.q, me.r);
  const halfW = (NEIGHBOR_RADIUS + 0.8) * HEX * Math.sqrt(3);
  const halfH = (NEIGHBOR_RADIUS * 1.5 + 1.2) * HEX;
  const label = (s: TakenSlot) => s.name ?? fmt(t.map.colonistN, { n: s.n });

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`${mx - halfW} ${my - halfH} ${halfW * 2} ${halfH * 2}`}
        className="poly w-full bg-black/30"
        role="img"
        aria-label={t.colonist.neighborsTitle}
      >
        <path d={L.normal} fill="var(--c)" fillOpacity={0.16} />
        <path d={L.good} fill="var(--c)" fillOpacity={0.28} />
        <path d={L.rich} fill="var(--c)" fillOpacity={0.55} />
        <path d={L.held} fill="var(--orange)" className="blink" />
        <path d={L.taken} fill="var(--mars-3)" fillOpacity={0.9} />
        <path d={L.deposit} fill="var(--radar)" fillOpacity={0.85} />
        <path d={L.poles} stroke="var(--foreground)" strokeWidth={1.2} fill="none" />
        <path d={L.flags} fill="var(--c)" />

        {/* Il tuo slot */}
        <path d={hexPath(me.q, me.r, 1)} fill="var(--mars-3)" stroke="var(--radar)" strokeWidth={2.5} />
        <path
          d={`M${(mx - 3).toFixed(1)} ${(my + 8).toFixed(1)}V${(my - 9).toFixed(1)}`}
          stroke="var(--foreground)"
          strokeWidth={1.4}
        />
        <path
          d={`M${(mx - 3).toFixed(1)} ${(my - 9).toFixed(1)}L${(mx + 9).toFixed(1)} ${(my - 5).toFixed(1)}L${(mx - 3).toFixed(1)} ${(my - 1).toFixed(1)}Z`}
          fill="var(--c)"
        />
        <text
          x={mx}
          y={my + 15}
          textAnchor="middle"
          fontSize={8}
          fontWeight={700}
          fill="var(--radar)"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t.colonist.you}
        </text>

        {badges.map((b) => (
          <text
            key={b.n}
            x={b.x}
            y={b.y}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill="var(--foreground)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {b.n}
          </text>
        ))}
      </svg>

      {/* Il tuo nome, poi l'elenco dei vicini: nome grande, slot e distanza */}
      <div className="poly flex items-center gap-3 border-l-4 border-radar bg-radar/10 p-3">
        <span className="font-display text-sm text-radar">{t.colonist.you}</span>
        <span className="min-w-0 flex-1 truncate font-display text-xl">{myName}</span>
        <span className="text-xs opacity-70">{fmt(t.map.slot, me)}</span>
      </div>

      <h3 className="mt-2 font-display text-2xl">{t.colonist.neighborsListTitle}</h3>
      <ul className="flex flex-col gap-2">
        {listed.map((s, i) => (
          <li key={`${s.q}-${s.r}`} className="poly flex items-center gap-3 bg-white/5 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-mars-3 font-display text-sm">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-display text-xl">{label(s)}</span>
            <span className="text-right text-xs opacity-70">
              {fmt(t.map.slot, { q: s.q, r: s.r })}
              <br />
              {fmt(s.d === 1 ? t.colonist.awayOne : t.colonist.away, { d: s.d })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
