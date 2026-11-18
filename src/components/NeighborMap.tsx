import { getDict } from "@/lib/i18n/server";
import {
  HEX,
  NEIGHBOR_RADIUS,
  depositDistance,
  hexCenter,
  hexPath,
  neighborhood,
  richness,
  type Deposit,
} from "@/lib/hex";
import type { HeldSlot, TakenSlot } from "@/lib/map-data";

/** Il tuo slot con i vicini attorno: SVG statico, nessun JavaScript. */
export async function NeighborMap({
  me,
  cols,
  rows,
  deposits,
  neighbors,
  held,
}: {
  me: { q: number; r: number };
  cols: number;
  rows: number;
  deposits: Deposit[];
  neighbors: TakenSlot[];
  held: HeldSlot[];
}) {
  const { t } = await getDict();
  const cells = neighborhood(me.q, me.r, cols, rows);
  const taken = new Map(neighbors.map((s) => [`${s.q}-${s.r}`, s]));
  const heldSet = new Set(held.map((s) => `${s.q}-${s.r}`));

  const L = { normal: "", good: "", rich: "", held: "", taken: "", deposit: "", poles: "", flags: "" };
  const names: { x: number; y: number; text: string }[] = [];
  for (const { q, r } of cells) {
    if (q === me.q && r === me.r) continue;
    const key = `${q}-${r}`;
    const d = depositDistance(deposits, q, r);
    const [cx, cy] = hexCenter(q, r);
    if (d === 0) {
      L.deposit += hexPath(q, r, 1);
    } else if (taken.has(key)) {
      const s = taken.get(key)!;
      L.taken += hexPath(q, r);
      L.poles += `M${(cx - 3).toFixed(1)} ${(cy + 7).toFixed(1)}V${(cy - 8).toFixed(1)}`;
      L.flags += `M${(cx - 3).toFixed(1)} ${(cy - 8).toFixed(1)}L${(cx + 7).toFixed(1)} ${(cy - 4.5).toFixed(1)}L${(cx - 3).toFixed(1)} ${(cy - 1).toFixed(1)}Z`;
      const text = s.name ?? `#${s.n}`;
      names.push({ x: cx, y: cy + 13, text: text.length > 10 ? text.slice(0, 9) + "…" : text });
    } else if (heldSet.has(key)) {
      L.held += hexPath(q, r);
    } else {
      L[richness(d)] += hexPath(q, r);
    }
  }

  const [mx, my] = hexCenter(me.q, me.r);
  const halfW = (NEIGHBOR_RADIUS + 0.8) * HEX * Math.sqrt(3);
  const halfH = (NEIGHBOR_RADIUS * 1.5 + 1.2) * HEX;

  return (
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
        y={my + 14}
        textAnchor="middle"
        fontSize={6}
        fontWeight={700}
        fill="var(--radar)"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t.colonist.you}
      </text>

      {names.map((n, i) => (
        <text key={i} x={n.x} y={n.y} textAnchor="middle" fontSize={5.5} fill="var(--foreground)">
          {n.text}
        </text>
      ))}
    </svg>
  );
}
