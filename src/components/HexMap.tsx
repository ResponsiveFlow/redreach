"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { HOLD_MINUTES } from "@/lib/hold";
import { HOLD_EVENT, saveHoldCookie, sessionId, useHold } from "@/lib/hold-client";
import { HEX, depositDistance, hexCenter, hexPath, pointToHex, richness, sectorBounds } from "@/lib/hex";
import { getHeld, getSectorState, type HeldSlot, type SectorInfo, type TakenSlot } from "@/lib/map-data";
import type { Zone } from "@/lib/zones";

type View = { x: number; y: number; k: number };
type Size = { w: number; h: number };

const K_MAX = 5;
const CENTER_MS = 320; // durata dell'animazione che porta lo slot al centro
// I nomi compaiono da zoom 1,3 in su (circa due livelli sotto il massimo comodo).
const K_NAMES = 1.3;
/**
 * Dimensione del carattere (in unità della mappa) e caratteri massimi che stanno nell'esagono.
 * Da lontano il carattere si ingrandisce, per restare leggibile (~11px sullo schermo), e il nome si accorcia.
 */
function nameLayout(k: number): { font: number; chars: number } {
  const font = Math.max(5, 11 / k);
  const room = 29; // larghezza utile di un esagono, in unità
  const chars = Math.max(3, Math.min(8, Math.floor((room - 0.2 * font) / (0.68 * font))));
  return { font, chars };
}
const MARGIN = 60;
const POLL_HELD_MS = 6_000; // chi sta scegliendo: aggiornamento frequente (effetto "live")
const POLL_ALL_MS = 30_000; // mappa completa

export function HexMap({
  zone,
  sector,
  initialTaken,
  initialHeld,
  focus,
  mine = null,
  mySlot = null,
  readOnly = false,
}: {
  zone: Zone;
  sector: SectorInfo;
  initialTaken: TakenSlot[];
  initialHeld: HeldSlot[];
  focus: { q: number; r: number } | null;
  /** Lo slot di chi guarda (se ha già prenotato): evidenziato. */
  mine?: { q: number; r: number } | null;
  /** Lo slot di chi guarda, con zona e settore (anche se è in un'altra mappa). */
  mySlot?: { zone: Zone; sectorId: number; sectorIndex: number; q: number; r: number } | null;
  /** Chi ha già uno slot vede la mappa ma non può prenotare. */
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const myHold = useHold();
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState({ taken: initialTaken, held: initialHeld });
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const [selected, setSelected] = useState<{ q: number; r: number } | null>(null);
  // Quanto la card in basso copre la mappa: serve per poter portare al centro anche gli slot in fondo.
  const [cover, setCover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const viewRef = useRef<View | null>(null);
  const centerRef = useRef<(q: number, r: number) => void>(() => {});
  const svgRef = useRef<SVGSVGElement>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, startX: 0, startY: 0, pinch: 0 });

  const { cols, rows, deposits } = sector;
  const bounds = useMemo(() => sectorBounds(cols, rows), [cols, rows]);

  // ---------------------------------------------------------------- dimensioni
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---------------------------------------------------------------- vista (zoom/pan)
  const kMin = size.w ? Math.min(size.w / bounds.width, size.h / bounds.height) * 0.98 : 0.3;

  function clampTo(v: View, coverPx: number): View {
    const k = Math.min(K_MAX, Math.max(kMin, v.k));
    const axis = (pos: number, screen: number, min: number, len: number, pad = 0) => {
      const content = len * k;
      if (content <= screen) return (screen - content) / 2 - k * min;
      return Math.min(MARGIN - k * min, Math.max(screen - MARGIN - pad - k * (min + len), pos));
    };
    return {
      k,
      x: axis(v.x, size.w, bounds.minX, bounds.width),
      y: axis(v.y, size.h, bounds.minY, bounds.height, coverPx),
    };
  }
  const clamp = (v: View): View => clampTo(v, cover);

  function initialView(): View {
    if (focus) {
      const [cx, cy] = hexCenter(focus.q, focus.r);
      const k = 2.2;
      return { k, x: size.w / 2 - k * cx, y: size.h / 2 - k * cy };
    }
    return { k: kMin, x: 0, y: 0 };
  }

  const current: View | null = size.w ? clamp(view ?? initialView()) : null;

  function cancelAnim() {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }

  function update(fn: (v: View) => View) {
    cancelAnim(); // se l'utente muove la mappa, l'animazione si ferma
    setView((prev) => clamp(fn(clamp(prev ?? initialView()))));
  }

  function zoomAt(px: number, py: number, factor: number) {
    update((v) => {
      const k = Math.min(K_MAX, Math.max(kMin, v.k * factor));
      const f = k / v.k;
      return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    });
  }

  /**
   * Porta lo slot al centro della parte di mappa che si vede davvero (sopra la card, sotto
   * il bordo dello schermo), con una breve animazione.
   */
  function centerOnSlot(q: number, r: number) {
    const wrap = wrapRef.current;
    const base = viewRef.current;
    if (!wrap || !base || !size.w) return;
    const rect = wrap.getBoundingClientRect();
    const panelTop = panelRef.current?.getBoundingClientRect().top ?? window.innerHeight;
    const top = Math.max(0, -rect.top);
    const bottom = Math.min(rect.height, panelTop - rect.top);
    if (bottom - top < 80) return; // quasi niente spazio visibile: meglio non muovere nulla
    const nextCover = Math.max(0, rect.height - bottom);
    const [cx, cy] = hexCenter(q, r);
    const target = clampTo(
      { k: base.k, x: size.w / 2 - base.k * cx, y: (top + bottom) / 2 - base.k * cy },
      nextCover,
    );
    setCover(nextCover);
    cancelAnim();
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / CENTER_MS);
      const e = 1 - Math.pow(1 - p, 3); // parte veloce, finisce piano
      setView({ k: base.k, x: base.x + (target.x - base.x) * e, y: base.y + (target.y - base.y) * e });
      animRef.current = p < 1 ? requestAnimationFrame(step) : null;
    };
    animRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    viewRef.current = current;
    centerRef.current = centerOnSlot;
  });

  // Quando scegli uno slot, dopo che la card si è aggiornata, lo porta al centro.
  useEffect(() => {
    if (!selected) return;
    const id = requestAnimationFrame(() => centerRef.current(selected.q, selected.r));
    return () => cancelAnimationFrame(id);
  }, [selected]);

  // La rotella va registrata come listener non passivo per poter bloccare lo scroll della pagina.
  const zoomRef = useRef(zoomAt);
  useEffect(() => {
    zoomRef.current = zoomAt;
  });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomRef.current(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0015));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  // ---------------------------------------------------------------- aggiornamento live
  useEffect(() => {
    const fast = setInterval(() => {
      if (document.hidden) return;
      getHeld(supabase, sector.id)
        .then((held) => setState((s) => ({ ...s, held })))
        .catch(() => {});
    }, POLL_HELD_MS);
    const slow = setInterval(() => {
      if (document.hidden) return;
      getSectorState(supabase, sector.id).then(setState).catch(() => {});
    }, POLL_ALL_MS);
    return () => {
      clearInterval(fast);
      clearInterval(slow);
    };
  }, [supabase, sector.id]);

  useEffect(() => {
    const refresh = () => {
      getHeld(supabase, sector.id)
        .then((held) => setState((s) => ({ ...s, held })))
        .catch(() => {});
    };
    window.addEventListener(HOLD_EVENT, refresh);
    return () => window.removeEventListener(HOLD_EVENT, refresh);
  }, [supabase, sector.id]);

  // ---------------------------------------------------------------- livelli grafici
  const tiers = useMemo(() => {
    const a = new Uint8Array(cols * rows); // 0 normale, 1 buono, 2 ricco, 3 giacimento
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const d = depositDistance(deposits, q, r);
        a[r * cols + q] = d === 0 ? 3 : { normal: 0, good: 1, rich: 2 }[richness(d)];
      }
    }
    return a;
  }, [cols, rows, deposits]);

  const takenMap = useMemo(() => new Map(state.taken.map((s) => [s.r * cols + s.q, s])), [state.taken, cols]);
  // Il tuo slot bloccato non è "di un altro": si distingue e si può riprendere.
  const own = myHold && myHold.s === sector.id ? { q: myHold.q, r: myHold.r } : null;
  const ownKey = own ? own.r * cols + own.q : -1;
  const heldSet = useMemo(
    () => new Set(state.held.map((s) => s.r * cols + s.q).filter((k) => k !== ownKey)),
    [state.held, cols, ownKey],
  );
  const claiming = heldSet.size;

  const layers = useMemo(() => {
    const L = { normal: "", good: "", rich: "", held: "", taken: "", deposit: "", poles: "", flags: "" };
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const i = r * cols + q;
        const tier = tiers[i];
        if (tier === 3) {
          L.deposit += hexPath(q, r, 1);
        } else if (takenMap.has(i)) {
          L.taken += hexPath(q, r);
          const [cx, cy] = hexCenter(q, r);
          L.poles += `M${(cx - 3).toFixed(1)} ${(cy + 7).toFixed(1)}V${(cy - 8).toFixed(1)}`;
          L.flags += `M${(cx - 3).toFixed(1)} ${(cy - 8).toFixed(1)}L${(cx + 7).toFixed(1)} ${(cy - 4.5).toFixed(1)}L${(cx - 3).toFixed(1)} ${(cy - 1).toFixed(1)}Z`;
        } else if (heldSet.has(i)) {
          L.held += hexPath(q, r);
        } else {
          L[tier === 2 ? "rich" : tier === 1 ? "good" : "normal"] += hexPath(q, r);
        }
      }
    }
    return L;
  }, [tiers, takenMap, heldSet, cols, rows]);

  // ---------------------------------------------------------------- gesti
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    cancelAnim();
    e.currentTarget.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (ptrs.current.size === 1) {
      g.moved = false;
      g.startX = e.clientX;
      g.startY = e.clientY;
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      g.moved = true;
      g.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev) return;
    const g = gesture.current;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 1) {
      if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > 6) g.moved = true;
      if (g.moved) {
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        update((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      }
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.pinch > 0) {
        const rect = e.currentTarget.getBoundingClientRect();
        zoomAt((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, dist / g.pinch);
      }
      g.pinch = dist;
    }
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    const wasSingle = ptrs.current.size === 1 && ptrs.current.has(e.pointerId);
    ptrs.current.delete(e.pointerId);
    if (!wasSingle || gesture.current.moved || !current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const wx = (e.clientX - rect.left - current.x) / current.k;
    const wy = (e.clientY - rect.top - current.y) / current.k;
    const { q, r } = pointToHex(wx, wy);
    setError(null);
    if (q < 0 || q >= cols || r < 0 || r >= rows || tiers[r * cols + q] === 3) {
      setSelected(null);
    } else {
      setSelected({ q, r });
    }
  }

  function onPointerCancel(e: React.PointerEvent<SVGSVGElement>) {
    ptrs.current.delete(e.pointerId);
  }

  // ---------------------------------------------------------------- prenotazione
  async function reserve() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("hold_slot", {
      p_session: sessionId(),
      p_sector: sector.id,
      p_q: selected.q,
      p_r: selected.r,
    });
    if (err || !data) {
      setBusy(false);
      if (err?.message.includes("slot_taken")) {
        setError(t.map.errTaken);
        getSectorState(supabase, sector.id).then(setState).catch(() => {});
      } else if (err?.message.includes("slot_invalid")) {
        setError(t.map.errInvalid);
      } else {
        setError(t.map.errGeneric);
      }
      return;
    }
    const hold = { z: zone, s: sector.id, q: selected.q, r: selected.r, exp: new Date(data).getTime() };
    saveHoldCookie(hold);
    router.push("/join");
  }

  // ---------------------------------------------------------------- pannello
  const selKey = selected ? selected.r * cols + selected.q : -1;
  const selTaken = selected ? takenMap.get(selKey) : undefined;
  const selHeld = selected ? heldSet.has(selKey) && !selTaken : false;
  const selOwn = !!selected && !!own && own.q === selected.q && own.r === selected.r;
  const selDistance = selected ? depositDistance(deposits, selected.q, selected.r) : 0;
  const selRich = selected ? richness(selDistance) : "normal";

  const labelOf = (s: TakenSlot) => s.name ?? fmt(t.map.colonistN, { n: s.n });

  // Nomi visibili solo da vicino e solo per ciò che è nell'inquadratura (mappa leggera).
  const names: { key: number; x: number; y: number; text: string; font: number }[] = [];
  if (current && current.k >= K_NAMES) {
    const { font, chars } = nameLayout(current.k);
    const x0 = -current.x / current.k - HEX * 2;
    const x1 = (size.w - current.x) / current.k + HEX * 2;
    const y0 = -current.y / current.k - HEX * 2;
    const y1 = (size.h - current.y) / current.k + HEX * 2;
    for (const s of state.taken) {
      const [cx, cy] = hexCenter(s.q, s.r);
      if (cx < x0 || cx > x1 || cy < y0 || cy > y1) continue;
      const text = s.name ?? `#${s.n}`;
      names.push({
        key: s.r * cols + s.q,
        x: cx,
        y: cy + 11 + 0.5 * font,
        font,
        text: text.length > chars ? text.slice(0, chars - 1) + "…" : text,
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Spazio sempre riservato: quando la riga compare la mappa non si sposta. */}
      <div className="min-h-8 text-xs font-bold uppercase tracking-wider text-orange">
        {claiming > 0 && (
          <p className="flex items-start gap-2">
            <span className="blink mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-orange" />
            {fmt(claiming === 1 ? t.map.claimingOne : t.map.claimingMany, {
              n: claiming,
              sector: `${t.zones[zone].name} ${sector.index}`,
            })}
          </p>
        )}
      </div>
      <div
        ref={wrapRef}
        className="poly relative h-[46svh] min-h-[280px] w-full overflow-hidden bg-black/30"
      >
        <svg
          ref={svgRef}
          role="img"
          aria-label={t.map.mapLabel}
          className="absolute inset-0 h-full w-full select-none"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {current && (
            <g transform={`translate(${current.x} ${current.y}) scale(${current.k})`}>
              <path d={layers.normal} fill="var(--c)" fillOpacity={0.16} />
              <path d={layers.good} fill="var(--c)" fillOpacity={0.28} />
              <path d={layers.rich} fill="var(--c)" fillOpacity={0.55} />
              <path d={layers.held} fill="var(--orange)" className="blink" />
              <path d={layers.taken} fill="var(--mars-3)" fillOpacity={0.9} />
              <path d={layers.deposit} fill="var(--radar)" fillOpacity={0.85} />
              <path d={layers.poles} stroke="var(--foreground)" strokeWidth={1.2} fill="none" />
              <path d={layers.flags} fill="var(--c)" />
              {focus && (
                <path
                  d={hexPath(focus.q, focus.r, 1.05)}
                  fill="none"
                  stroke="var(--orange)"
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                />
              )}
              {own && (
                <path
                  d={hexPath(own.q, own.r, 1)}
                  fill="var(--radar)"
                  fillOpacity={0.35}
                  stroke="var(--radar)"
                  strokeWidth={2.5}
                />
              )}
              {mine && (
                <path
                  d={hexPath(mine.q, mine.r, 1.05)}
                  fill="none"
                  stroke="var(--radar)"
                  strokeWidth={3}
                />
              )}
              {selected && (
                <path
                  d={hexPath(selected.q, selected.r, 1)}
                  fill="var(--radar)"
                  fillOpacity={0.25}
                  stroke="var(--radar)"
                  strokeWidth={2.5}
                />
              )}
              {names.map((n) => {
                const w = n.text.length * 0.68 * n.font + n.font; // larghezza stimata della targhetta
                return (
                  <g key={n.key} style={{ pointerEvents: "none" }}>
                    <rect
                      x={n.x - w / 2}
                      y={n.y - 1.12 * n.font}
                      width={w}
                      height={1.52 * n.font}
                      rx={0.32 * n.font}
                      fill="#120b14"
                      fillOpacity={0.85}
                    />
                    <text
                      x={n.x}
                      y={n.y}
                      textAnchor="middle"
                      fontSize={n.font}
                      fontWeight={700}
                      fill="var(--foreground)"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {n.text}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
        <div className="absolute right-2 top-2 flex flex-col gap-2">
          <button
            type="button"
            aria-label={t.map.zoomIn}
            className="poly h-10 w-10 bg-background/80 font-display text-xl"
            onClick={() => zoomAt(size.w / 2, size.h / 2, 1.5)}
          >
            +
          </button>
          <button
            type="button"
            aria-label={t.map.zoomOut}
            className="poly h-10 w-10 bg-background/80 font-display text-xl"
            onClick={() => zoomAt(size.w / 2, size.h / 2, 1 / 1.5)}
          >
            −
          </button>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] uppercase tracking-wider opacity-80">
        <Legend color="var(--c)" opacity={0.25} label={t.map.legendFree} />
        <Legend color="var(--c)" opacity={0.7} label={t.map.legendRich} />
        <Legend color="var(--mars-3)" opacity={0.9} label={t.map.legendTaken} />
        <Legend color="var(--radar)" opacity={0.9} label={t.map.legendDeposit} />
        <Legend color="var(--orange)" opacity={1} label={t.map.legendHeld} blink />
        {mine && <Legend color="var(--radar)" opacity={1} label={t.map.legendMine} />}
      </ul>


      {/* Resta agganciato al fondo dello schermo: il bottone è sempre visibile. */}
      <div
        ref={panelRef}
        className="poly sticky bottom-3 z-10 flex min-h-[112px] flex-col justify-center gap-3 p-4"
        style={{ background: "color-mix(in srgb, var(--foreground) 12%, var(--background))" }}
        aria-live="polite"
      >
        {!selected && !readOnly && <p className="text-sm opacity-80">{t.map.hint}</p>}

        {!selected && readOnly && (mine || !mySlot) && (
          <p className="text-sm opacity-80">{t.map.youHave}</p>
        )}

        {!selected && readOnly && !mine && mySlot && (
          <>
            <p className="font-display text-lg leading-tight">
              {fmt(t.map.alreadyHave, {
                sector: `${t.zones[mySlot.zone].name} ${mySlot.sectorIndex}`,
              })}
            </p>
            <Link
              href={`/zone/${mySlot.zone}?sector=${mySlot.sectorId}&focus=${mySlot.q}-${mySlot.r}`}
              className="btn"
            >
              {t.map.viewMine}
            </Link>
          </>
        )}

        {selected && selOwn && !selTaken && (
          <>
            <p className="font-display text-xl">{fmt(t.map.slot, selected)}</p>
            <p className="text-sm opacity-80">{t.map.yourHold}</p>
            <Link href="/join" className="btn">
              {t.map.completeReg}
            </Link>
          </>
        )}

        {selected && selTaken && (
          <>
            <p className="font-display text-xl">{labelOf(selTaken)}</p>
            <p className="text-sm opacity-80">
              {fmt(t.map.slot, selected)} · {t.map.taken}
            </p>
          </>
        )}

        {selected && !selTaken && !selOwn && selHeld && (
          <>
            <p className="font-display text-xl">{fmt(t.map.slot, selected)}</p>
            <p className="text-sm opacity-80">{t.map.held}</p>
          </>
        )}

        {selected && !selTaken && !selOwn && !selHeld && (
          <>
            <div className="flex flex-col gap-1">
              <p className="font-display text-xl">
                {fmt(t.map.slot, selected)} · {fmt(selDistance === 1 ? t.map.fromDepositOne : t.map.fromDeposit, { d: selDistance })}
              </p>
              {selRich !== "normal" && (
                <p className="text-sm font-bold" style={{ color: "var(--c)" }}>
                  {selRich === "rich" ? t.map.rich : t.map.good}
                </p>
              )}
            </div>
            {!readOnly && (
              <>
                <button type="button" className="btn" disabled={busy} onClick={reserve}>
                  {busy ? t.map.reserving : t.map.reserve}
                </button>
                <p className="text-xs opacity-70">{fmt(t.map.holdNote, { m: HOLD_MINUTES })}</p>
                <p className="text-xs font-bold text-orange">{t.map.finalNote}</p>
              </>
            )}
            {readOnly && <p className="text-xs opacity-70">{t.map.onlyOne}</p>}
          </>
        )}

        {error && (
          <p role="alert" className="text-sm font-bold text-orange">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Legend({
  color,
  opacity,
  label,
  blink,
}: {
  color: string;
  opacity: number;
  label: string;
  blink?: boolean;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 ${blink ? "blink" : ""}`} style={{ background: color, opacity }} />
      {label}
    </li>
  );
}
