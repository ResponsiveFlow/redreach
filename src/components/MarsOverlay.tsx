"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { ZONES, type Zone } from "@/lib/zones";

type Row = { id: number; zone: Zone; index: number; fill: number };
type Status = "idle" | "loading" | "error" | "ready";

// ---------------------------------------------------------------- geometria del pianeta
const CX = 200;
const CY = 200;
const R = 185;
const SQRT3 = Math.sqrt(3);

/** Tre regioni: calotta (Ghiaccio) in alto, Metalli a sinistra, Sole a destra. */
const REGIONS: Record<Zone, { path: string; ax: number; ay: number; lx: number; ly: number }> = {
  ice: { path: "M0 0H400V150L200 112L0 150Z", ax: 200, ay: 74, lx: 200, ly: 34 },
  metal: { path: "M0 150L200 112V400H0Z", ax: 112, ay: 250, lx: 122, ly: 352 },
  sun: { path: "M400 150L200 112V400H400Z", ax: 288, ay: 250, lx: 278, ly: 352 },
};

const boundaryY = (x: number) => 112 + (Math.abs(x - 200) * 38) / 200;

/** Il centro di una tessera deve stare dentro la propria regione e dentro il disco. */
function fits(zone: Zone, x: number, y: number, rad: number): boolean {
  if (Math.hypot(x - CX, y - CY) > R - rad * 1.1) return false;
  if (zone === "ice") return y < boundaryY(x) - rad * 1.1;
  const inside = zone === "metal" ? x < 200 - rad * 1.1 : x > 200 + rad * 1.1;
  return inside && y > boundaryY(x) + rad * 1.1;
}

/** Posizioni delle tessere: griglia esagonale compatta attorno al centro della regione. */
function layout(zone: Zone, n: number): { rad: number; spots: { x: number; y: number }[] } {
  const { ax, ay } = REGIONS[zone];
  for (let rad = 26; rad >= 5; rad *= 0.92) {
    const cand: { x: number; y: number }[] = [];
    for (let r = -12; r <= 12; r++) {
      for (let q = -12; q <= 12; q++) {
        const x = ax + rad * SQRT3 * (q + r / 2);
        const y = ay + rad * 1.5 * r;
        if (fits(zone, x, y, rad)) cand.push({ x, y });
      }
    }
    if (cand.length >= n) {
      cand.sort((a, b) => Math.hypot(a.x - ax, a.y - ay) - Math.hypot(b.x - ax, b.y - ay));
      return { rad, spots: cand.slice(0, n) };
    }
  }
  return { rad: 5, spots: [] };
}

function tilePath(cx: number, cy: number, rad: number): string {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i + 30);
    d += `${i ? "L" : "M"}${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }
  return d + "Z";
}

// ---------------------------------------------------------------- superficie low-poly (una volta sola)
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE: [number, number, number][] = [
  [226, 82, 43], // #E2522B
  [199, 64, 31], // #C7401F
  [169, 53, 26], // #A9351A
  [122, 36, 18], // #7A2412
];

const FACETS: { d: string; fill: string }[] = (() => {
  const rnd = mulberry32(2056);
  const step = 40;
  const n = 12;
  const pts: [number, number][][] = [];
  for (let j = 0; j < n; j++) {
    pts[j] = [];
    for (let i = 0; i < n; i++) {
      pts[j][i] = [-20 + i * step + (rnd() - 0.5) * 26, -20 + j * step + (rnd() - 0.5) * 26];
    }
  }
  const out: { d: string; fill: string }[] = [];
  const tri = (a: [number, number], b: [number, number], c: [number, number]) => {
    const mx = (a[0] + b[0] + c[0]) / 3;
    const my = (a[1] + b[1] + c[1]) / 3;
    if (Math.hypot(mx - CX, my - CY) > R + 25) return;
    const base = PALETTE[Math.floor(rnd() * PALETTE.length)];
    const light = 1.15 - ((mx + my) / 800) * 0.55 + (rnd() - 0.5) * 0.12; // luce da in alto a sinistra
    const col = base.map((v) => Math.max(0, Math.min(255, Math.round(v * light * 0.62))));
    out.push({
      d: `M${a[0].toFixed(0)} ${a[1].toFixed(0)}L${b[0].toFixed(0)} ${b[1].toFixed(0)}L${c[0].toFixed(0)} ${c[1].toFixed(0)}Z`,
      fill: `rgb(${col[0]} ${col[1]} ${col[2]})`,
    });
  };
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      tri(pts[j][i], pts[j][i + 1], pts[j + 1][i]);
      tri(pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]);
    }
  }
  return out;
})();

// ---------------------------------------------------------------- componente
export function MarsOverlay({ currentSectorId }: { currentSectorId?: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [rows, setRows] = useState<Row[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);

  async function load() {
    setStatus("loading");
    const { data, error } = await supabase
      .from("sector_stats")
      .select("sector_id, zone, index, fill")
      .order("index");
    if (error || !data) {
      setStatus("error");
      return;
    }
    setRows(
      data.map((r) => ({
        id: Number(r.sector_id),
        zone: r.zone as Zone,
        index: Number(r.index),
        fill: Number(r.fill ?? 0),
      })),
    );
    setStatus("ready");
  }

  function show() {
    setOpen(true);
    void load();
  }

  // Dialogo: Esc chiude, la pagina sotto non scorre, il focus va sul bottone di chiusura.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tiles = useMemo(() => {
    return ZONES.flatMap((zone) => {
      const mine = rows.filter((r) => r.zone === zone);
      const { rad, spots } = layout(zone, mine.length);
      return mine.map((row, i) => ({ row, rad, ...(spots[i] ?? { x: -100, y: -100 }) }));
    });
  }, [rows]);

  function go(zone: Zone, sectorId?: number) {
    setOpen(false);
    if (sectorId !== undefined && sectorId === currentSectorId) return;
    router.push(sectorId ? `/zone/${zone}?sector=${sectorId}` : `/zone/${zone}`);
  }

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={show}>
        <PlanetIcon />
        {t.mars.open}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.mars.title}
          className="fixed inset-0 z-50 overflow-y-auto bg-background"
        >
          <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl text-mars">{t.mars.title}</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="poly h-11 bg-white/10 px-4 font-display text-sm uppercase"
              >
                {t.mars.close} ✕
              </button>
            </div>
            <p className="text-sm opacity-80">{t.mars.hint}</p>

            <div className="relative aspect-square w-full">
              <svg viewBox="0 0 400 400" className="h-full w-full" role="group" aria-label={t.mars.title}>
                <defs>
                  <clipPath id="mars-disc">
                    <circle cx={CX} cy={CY} r={R} />
                  </clipPath>
                  <radialGradient id="mars-limb" cx="38%" cy="32%" r="75%">
                    <stop offset="55%" stopColor="#120b14" stopOpacity="0" />
                    <stop offset="100%" stopColor="#120b14" stopOpacity="0.7" />
                  </radialGradient>
                </defs>

                <circle cx={CX} cy={CY} r={R + 7} fill="none" stroke="var(--radar)" strokeOpacity={0.22} strokeWidth={2} />
                <g clipPath="url(#mars-disc)">
                  {FACETS.map((f, i) => (
                    <path key={i} d={f.d} fill={f.fill} stroke={f.fill} strokeWidth={0.6} />
                  ))}
                  {ZONES.map((zone) => (
                    <path
                      key={zone}
                      d={REGIONS[zone].path}
                      fill={`var(--${zone})`}
                      fillOpacity={0.16}
                      stroke="var(--foreground)"
                      strokeOpacity={0.35}
                      strokeWidth={1.2}
                      className="cursor-pointer"
                      onClick={() => go(zone)}
                    />
                  ))}
                  <circle cx={CX} cy={CY} r={R} fill="url(#mars-limb)" pointerEvents="none" />
                </g>

                {ZONES.map((zone) => (
                  <text
                    key={zone}
                    x={REGIONS[zone].lx}
                    y={REGIONS[zone].ly}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    letterSpacing={1.5}
                    fill={`var(--${zone})`}
                    style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", pointerEvents: "none" }}
                  >
                    {t.zones[zone].name}
                  </text>
                ))}

                {tiles.map(({ row, rad, x, y }) => {
                  const here = row.id === currentSectorId;
                  const strong = row.fill > 0.5;
                  const label = fmt(t.mars.sector, { n: row.index });
                  return (
                    <g
                      key={row.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`${t.zones[row.zone].name} · ${label}${here ? ` · ${t.mars.you}` : ""}`}
                      className="cursor-pointer outline-none"
                      onClick={() => go(row.zone, row.id)}
                      onKeyDown={(e) => e.key === "Enter" && go(row.zone, row.id)}
                    >
                      <path d={tilePath(x, y, rad * 0.94)} fill="#120b14" fillOpacity={0.6} />
                      <path
                        d={tilePath(x, y, rad * 0.94)}
                        fill={`var(--${row.zone})`}
                        fillOpacity={0.28 + 0.72 * row.fill}
                        stroke={here ? "var(--radar)" : "var(--foreground)"}
                        strokeOpacity={here ? 1 : 0.45}
                        strokeWidth={here ? 3 : 1}
                      />
                      <text
                        x={x}
                        y={y + rad * 0.26}
                        textAnchor="middle"
                        fontSize={Math.max(6, rad * 0.75)}
                        fontWeight={700}
                        fill={strong ? "#120b14" : "var(--foreground)"}
                        style={{ fontFamily: "var(--font-display)", pointerEvents: "none" }}
                      >
                        {row.index}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {status === "loading" && (
                <p className="absolute inset-x-0 bottom-2 text-center text-xs uppercase tracking-widest text-radar">
                  {t.mars.loading}
                </p>
              )}
            </div>

            {status === "error" && (
              <div className="flex flex-col gap-3">
                <p role="alert" className="text-sm font-bold text-orange">
                  {t.mars.error}
                </p>
                <button type="button" className="btn btn-ghost" onClick={() => void load()}>
                  {t.mars.retry}
                </button>
              </div>
            )}

            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-wider opacity-80">
              <li className="flex items-center gap-2">
                {t.mars.legendEmpty}
                <svg viewBox="0 0 110 22" className="h-5 w-[110px]" aria-hidden="true">
                  {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
                    <g key={f}>
                      <path d={tilePath(11 + i * 22, 11, 10)} fill="#120b14" fillOpacity={0.6} />
                      <path
                        d={tilePath(11 + i * 22, 11, 10)}
                        fill="var(--foreground)"
                        fillOpacity={0.28 + 0.72 * f}
                        stroke="var(--foreground)"
                        strokeOpacity={0.45}
                      />
                    </g>
                  ))}
                </svg>
                {t.mars.legendFull}
              </li>
              {currentSectorId !== undefined && (
                <li className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 border-2" style={{ borderColor: "var(--radar)" }} />
                  {t.mars.you}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function PlanetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="var(--mars)" />
      <path d="M12 3a9 9 0 0 0-6.4 2.7L12 12z" fill="var(--mars-3)" />
      <path d="M12 12l6.4 6.3A9 9 0 0 0 21 12z" fill="var(--mars-4)" />
    </svg>
  );
}
