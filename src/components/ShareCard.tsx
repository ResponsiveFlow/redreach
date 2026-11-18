"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { Deposit } from "@/lib/hex";
import type { Zone } from "@/lib/zones";

const W = 1080;
const H = 1920;
const SQ3 = Math.sqrt(3);

const COL = {
  bg: "#120b14",
  mars: "#e2522b",
  mars3: "#a9351a",
  sand: "#ffd3a8",
  orange: "#f4925a",
  radar: "#5ef2d2",
};

export type CardNeighbor = { q: number; r: number; label: string };

type Props = {
  number: number;
  name: string | null;
  zone: Zone;
  q: number;
  r: number;
  sectorIndex: number;
  cols: number;
  rows: number;
  deposits: Deposit[];
  neighbors: CardNeighbor[];
  inviteUrl: string;
};

type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------- utilità di disegno
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setSpacing(c: Ctx, px: number) {
  if ("letterSpacing" in c) (c as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

function text(
  c: Ctx,
  str: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = "center",
  spacing = 0,
  alpha = 1,
) {
  c.font = font;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = "alphabetic";
  setSpacing(c, spacing);
  c.globalAlpha = alpha;
  c.fillText(str, x, y);
  setSpacing(c, 0);
  c.globalAlpha = 1;
}

/** Riduce il corpo del testo finché sta nella larghezza data. */
function fit(c: Ctx, str: string, family: string, size: number, maxW: number, spacing = 0): number {
  let s = size;
  setSpacing(c, spacing);
  for (; s > 24; s -= 4) {
    c.font = `700 ${s}px ${family}`;
    if (c.measureText(str).width <= maxW) break;
  }
  setSpacing(c, 0);
  return s;
}

function hexPath(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i + 30);
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.closePath();
}

function flag(c: Ctx, x: number, y: number, k: number, color: string, pole = COL.sand) {
  c.strokeStyle = pole;
  c.lineWidth = 1.4 * k;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x - 3 * k, y + 7 * k);
  c.lineTo(x - 3 * k, y - 8 * k);
  c.stroke();
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - 3 * k, y - 8 * k);
  c.lineTo(x + 7 * k, y - 4.5 * k);
  c.lineTo(x - 3 * k, y - 1 * k);
  c.closePath();
  c.fill();
}

/** Superficie low-poly: triangoli con luce da in alto a sinistra. */
function facets(
  c: Ctx,
  x0: number,
  y0: number,
  w: number,
  h: number,
  step: number,
  seed: number,
  lo: number,
  hi: number,
  lit?: (x: number, y: number) => number,
) {
  const rnd = mulberry32(seed);
  const cols = Math.ceil(w / step) + 2;
  const rows = Math.ceil(h / step) + 2;
  const pal = [
    [226, 82, 43],
    [199, 64, 31],
    [169, 53, 26],
    [122, 36, 18],
  ];
  const pts: [number, number][][] = [];
  for (let j = 0; j < rows; j++) {
    pts[j] = [];
    for (let i = 0; i < cols; i++) {
      pts[j][i] = [x0 - step + i * step + (rnd() - 0.5) * step * 0.7, y0 - step + j * step + (rnd() - 0.5) * step * 0.7];
    }
  }
  const tri = (a: [number, number], b: [number, number], d: [number, number]) => {
    const base = pal[Math.floor(rnd() * 4)];
    let k = lo + rnd() * (hi - lo);
    if (lit) k *= lit((a[0] + b[0] + d[0]) / 3, (a[1] + b[1] + d[1]) / 3);
    c.fillStyle = `rgb(${Math.round(base[0] * k)} ${Math.round(base[1] * k)} ${Math.round(base[2] * k)})`;
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.lineTo(d[0], d[1]);
    c.closePath();
    c.fill();
    c.strokeStyle = c.fillStyle;
    c.lineWidth = 1;
    c.stroke();
  };
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      tri(pts[j][i], pts[j][i + 1], pts[j + 1][i]);
      tri(pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]);
    }
  }
}

// ---------------------------------------------------------------- coordinate
// La griglia del gioco è "odd-r" (q colonna, r riga). Per disegnare la scena si lavora in assiali.
const toAx = (q: number, r: number) => ({ x: q - (r - (r & 1)) / 2, z: r });
const fromAx = (x: number, z: number) => ({ q: x + (z - (z & 1)) / 2, r: z });
const axDist = (dq: number, dr: number) => (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
const axPos = (dq: number, dr: number, s: number): [number, number] => [s * SQ3 * (dq + dr / 2), s * 1.5 * dr];

/**
 * Carta "passaporto con foto d'atterraggio": il documento del colono (numero, nome, zona,
 * settore, slot, codice a barre) con, come foto, il suo lotto su Marte e i vicini veri.
 */
async function draw(canvas: HTMLCanvasElement, p: Props, t: ReturnType<typeof useI18n>["t"]) {
  const c = canvas.getContext("2d");
  if (!c) return;
  const root = getComputedStyle(document.documentElement);
  const DISPLAY = root.getPropertyValue("--font-display").trim() || "sans-serif";
  const BODY = root.getPropertyValue("--font-body").trim() || "sans-serif";
  const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  const col = root.getPropertyValue(`--${p.zone}`).trim() || "#ffc24b";
  const zoneName = t.zones[p.zone].name.toUpperCase();
  const k = t.colonist.card;

  await Promise.all([
    document.fonts.load(`700 80px ${DISPLAY}`),
    document.fonts.load(`700 30px ${BODY}`),
  ]).catch(() => {});

  const num4 = String(p.number).padStart(4, "0");
  const sector = `S${String(p.sectorIndex).padStart(2, "0")}`;
  const slot = `${p.q}-${p.r}`;
  const name = p.name ?? "";

  // ---- sfondo: superficie low-poly molto scura
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  c.fillStyle = COL.bg;
  c.fillRect(0, 0, W, H);
  facets(c, 0, 0, W, H, 130, p.number * 31 + 7, 0.1, 0.22);
  const veil = c.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, "rgba(18,11,20,.55)");
  veil.addColorStop(1, "rgba(18,11,20,.85)");
  c.fillStyle = veil;
  c.fillRect(0, 0, W, H);
  text(c, k.hook, W / 2, 124, `700 34px ${BODY}`, COL.sand, "center", 0, 0.85);

  // ---- pannello del documento
  const px = 60;
  const py = 170;
  const pw = 960;
  const ph = 1500;
  const cut = 70;
  c.beginPath();
  c.moveTo(px + cut, py);
  c.lineTo(px + pw, py);
  c.lineTo(px + pw, py + ph - cut);
  c.lineTo(px + pw - cut, py + ph);
  c.lineTo(px, py + ph);
  c.lineTo(px, py + cut);
  c.closePath();
  c.fillStyle = "rgba(18,11,20,.9)";
  c.fill();
  c.lineWidth = 5;
  c.strokeStyle = col;
  c.stroke();
  text(c, "RED REACH", px + 50, py + 88, `700 48px ${DISPLAY}`, COL.mars, "left", 2);
  text(c, k.registry, px + pw - 50, py + 86, `700 22px ${BODY}`, COL.sand, "right", 4, 0.7);
  c.strokeStyle = col;
  c.globalAlpha = 0.4;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(px + 50, py + 118);
  c.lineTo(px + pw - 50, py + 118);
  c.stroke();
  c.globalAlpha = 1;

  // ---- "foto": la scena dell'atterraggio dentro una finestra con gli angoli tagliati
  const wx = 110;
  const wy = 308;
  const ww = 860;
  const wh = 660;
  const cw = 46;
  const win = () => {
    c.beginPath();
    c.moveTo(wx + cw, wy);
    c.lineTo(wx + ww, wy);
    c.lineTo(wx + ww, wy + wh - cw);
    c.lineTo(wx + ww - cw, wy + wh);
    c.lineTo(wx, wy + wh);
    c.lineTo(wx, wy + cw);
    c.closePath();
  };
  c.save();
  win();
  c.clip();

  const sky = c.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, "#07040b");
  sky.addColorStop(0.55, "#1f0c14");
  sky.addColorStop(1, "#4a1a12");
  c.fillStyle = sky;
  c.fillRect(wx, wy, ww, wh);
  const rnd = mulberry32(p.number * 17 + 3);
  for (let i = 0; i < 90; i++) {
    c.globalAlpha = 0.25 + rnd() * 0.65;
    c.fillStyle = rnd() > 0.85 ? COL.orange : "#fff3e2";
    c.beginPath();
    c.arc(wx + rnd() * ww, wy + rnd() * 380, 0.8 + rnd() * 2.4, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // pianeta
  const pcx = W / 2;
  const R = 900;
  const top = wy + 372;
  const pcy = top + R;
  c.save();
  c.beginPath();
  c.arc(pcx, pcy, R, 0, Math.PI * 2);
  c.clip();
  facets(c, wx, top - 10, ww, wh, 100, 91 + p.number, 0.5, 1.05, (x, y) => {
    const d = Math.hypot(x - pcx, y - pcy) / R;
    return 1.25 - Math.max(0, d - 0.55) * 1.2;
  });
  const shade = c.createRadialGradient(pcx, top + 40, 120, pcx, top + 260, 760);
  shade.addColorStop(0, "rgba(18,11,20,0)");
  shade.addColorStop(1, "rgba(18,11,20,.7)");
  c.fillStyle = shade;
  c.fillRect(wx, top - 10, ww, wh);
  c.restore();
  ([[28, 0.08], [14, 0.16], [6, 0.45], [3, 0.9]] as const).forEach(([lw, a]) => {
    c.beginPath();
    c.arc(pcx, pcy, R + lw / 2, 0, Math.PI * 2);
    c.lineWidth = lw;
    c.strokeStyle = COL.orange;
    c.globalAlpha = a;
    c.stroke();
  });
  c.globalAlpha = 1;
  const glow = c.createRadialGradient(W / 2, top, 10, W / 2, top, 420);
  glow.addColorStop(0, "rgba(244,146,90,.3)");
  glow.addColorStop(1, "rgba(244,146,90,0)");
  c.fillStyle = glow;
  c.fillRect(wx, wy, ww, wh);

  // cometa
  const comet = c.createLinearGradient(wx + ww - 110, wy + 40, 650, wy + 462);
  comet.addColorStop(0, "rgba(255,211,168,0)");
  comet.addColorStop(1, "rgba(255,243,226,.95)");
  c.strokeStyle = comet;
  c.lineWidth = 5;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(wx + ww - 110, wy + 40);
  c.lineTo(650, wy + 462);
  c.stroke();
  c.save();
  c.shadowColor = COL.orange;
  c.shadowBlur = 34;
  c.fillStyle = "#fff3e2";
  c.beginPath();
  c.arc(650, wy + 462, 9, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // ---- il lotto e i vicini veri sul terreno (stesse celle della mappa, inclinate)
  const gx = W / 2;
  const gy = wy + 540;
  const sq = 0.44;
  const hs = 46;
  const rr = 3;
  const me = toAx(p.q, p.r);
  const cells: [number, number][] = [];
  for (let dq = -rr; dq <= rr; dq++) {
    for (let dr = -rr; dr <= rr; dr++) {
      if (axDist(dq, dr) > rr) continue;
      const o = fromAx(me.x + dq, me.z + dr);
      if (o.q < 0 || o.q >= p.cols || o.r < 0 || o.r >= p.rows) continue; // oltre il bordo del settore
      cells.push([dq, dr]);
    }
  }
  cells.sort((a, b) => a[1] - b[1]);
  const keyOf = (q: number, r: number) => {
    const a = toAx(q, r);
    return `${a.x - me.x},${a.z - me.z}`;
  };
  const taken = new Map(p.neighbors.map((n) => [keyOf(n.q, n.r), n.label]));
  const deps = new Set(p.deposits.map((d) => keyOf(d.q, d.r)));

  c.save();
  c.translate(gx, gy);
  c.scale(1, sq);
  cells.forEach(([dq, dr]) => {
    const [x, y] = axPos(dq, dr, hs);
    const isMe = dq === 0 && dr === 0;
    const key = `${dq},${dr}`;
    hexPath(c, x, y, hs * 0.93);
    if (isMe) {
      c.save();
      c.shadowColor = col;
      c.shadowBlur = 50;
      c.fillStyle = col;
      c.globalAlpha = 0.92;
      c.fill();
      c.restore();
    } else if (deps.has(key)) {
      c.fillStyle = COL.radar;
      c.globalAlpha = 0.85;
      c.fill();
    } else if (taken.has(key)) {
      c.fillStyle = COL.mars3;
      c.globalAlpha = 0.95;
      c.fill();
    } else {
      c.fillStyle = col;
      c.globalAlpha = 0.12;
      c.fill();
    }
    c.globalAlpha = 1;
    c.lineWidth = 3;
    c.strokeStyle = isMe ? "#fff" : "rgba(255,211,168,.28)";
    c.stroke();
  });
  c.restore();

  const labels: { x: number; y: number; text: string; d: number }[] = [];
  cells.forEach(([dq, dr]) => {
    const [x, y] = axPos(dq, dr, hs);
    const sx = gx + x;
    const sy = gy + y * sq;
    const nm = taken.get(`${dq},${dr}`);
    if (dq === 0 && dr === 0) flag(c, sx, sy - 6, 10, col, "#fff3e2");
    else if (nm !== undefined) {
      flag(c, sx, sy - 3, 4, col);
      if (axDist(dq, dr) >= 2) labels.push({ x: sx, y: sy - 52, text: nm.length > 12 ? nm.slice(0, 11) + "…" : nm, d: axDist(dq, dr) });
    }
  });
  labels
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .forEach((l) => {
      c.font = `700 22px ${BODY}`;
      const w = c.measureText(l.text).width + 24;
      c.fillStyle = "rgba(18,11,20,.84)";
      c.fillRect(l.x - w / 2, l.y - 24, w, 33);
      text(c, l.text, l.x, l.y, `700 22px ${BODY}`, COL.sand, "center");
    });

  text(c, k.landed, wx + 40, wy + 62, `700 21px ${BODY}`, col, "left", 8, 0.95);
  const gloss = c.createLinearGradient(wx, wy, wx + ww * 0.7, wy + wh * 0.7);
  gloss.addColorStop(0, "rgba(255,255,255,.07)");
  gloss.addColorStop(0.5, "rgba(255,255,255,0)");
  c.fillStyle = gloss;
  c.fillRect(wx, wy, ww, wh);
  c.restore();
  win();
  c.lineWidth = 6;
  c.strokeStyle = col;
  c.stroke();

  // ---- dati del documento
  const ty = wy + wh;
  text(c, k.id, W / 2, ty + 58, `700 30px ${DISPLAY}`, col, "center", 10);
  text(
    c,
    `#${num4}`,
    W / 2,
    ty + (name ? 228 : 262),
    `700 ${fit(c, `#${num4}`, DISPLAY, name ? 190 : 210, 760)}px ${DISPLAY}`,
    COL.sand,
    "center",
  );
  if (name) text(c, name, W / 2, ty + 320, `700 ${fit(c, name, DISPLAY, 92, 760)}px ${DISPLAY}`, col, "center");
  const fy = ty + 396;
  (
    [
      [k.zoneLabel, zoneName, 250],
      [k.sectorLabel, sector, 540],
      [k.slotLabel, slot, 830],
    ] as const
  ).forEach(([label, value, x]) => {
    text(c, label, x, fy, `700 21px ${BODY}`, col, "center", 5);
    text(c, value, x, fy + 58, `700 ${fit(c, value, DISPLAY, 54, 250)}px ${DISPLAY}`, COL.sand, "center");
  });

  // codice a barre generato da numero e nome
  const rb = mulberry32(p.number * 977 + name.length * 13 + 5);
  const bx = px + 50;
  const bw = pw - 100;
  let x = bx;
  c.fillStyle = COL.sand;
  c.globalAlpha = 0.85;
  while (x < bx + bw) {
    const wbar = 3 + Math.floor(rb() * 3) * 3;
    if (rb() > 0.42) c.fillRect(x, ty + 494, wbar, 54);
    x += wbar + 3;
  }
  c.globalAlpha = 1;

  // righe da passaporto
  const mrz = (str: string, len: number) => {
    let s = str.toUpperCase().replace(/[^A-Z0-9]/g, "<");
    while (s.length < len) s += "<";
    return s.slice(0, len);
  };
  text(c, mrz(`P<RR<<${name || "COLONIST"}`, 36), px + 50, ty + 598, `500 32px ${MONO}`, COL.sand, "left", 0, 0.78);
  text(
    c,
    mrz(`${num4}<${p.zone}<${sector}<${p.q}<${p.r}`, 36),
    px + 50,
    ty + 640,
    `500 32px ${MONO}`,
    COL.sand,
    "left",
    0,
    0.78,
  );

  // ---- invito
  text(c, t.colonist.card.land, W / 2, 1772, `700 ${fit(c, t.colonist.card.land, DISPLAY, 92, 940)}px ${DISPLAY}`, COL.sand, "center");
  const shown = p.inviteUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  text(c, shown, W / 2, 1848, `700 ${fit(c, shown, BODY, 40, 960)}px ${BODY}`, COL.radar, "center");
}

/** Carta condivisibile 1080x1920 (storie Instagram/TikTok), generata nel browser. */
export function ShareCard(props: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const { number, name, zone, q, r, sectorIndex, cols, rows, deposits, neighbors, inviteUrl } = props;

  useEffect(() => {
    let cancelled = false;
    const canvas = ref.current;
    if (!canvas) return;
    draw(canvas, { number, name, zone, q, r, sectorIndex, cols, rows, deposits, neighbors, inviteUrl }, t)
      .then(() => !cancelled && setReady(true))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [number, name, zone, q, r, sectorIndex, cols, rows, deposits, neighbors, inviteUrl, t]);

  const fileName = `red-reach-colonist-${number}.png`;

  function toFile(): Promise<File | null> {
    return new Promise((resolve) => {
      ref.current?.toBlob(
        (b) => resolve(b ? new File([b], fileName, { type: "image/png" }) : null),
        "image/png",
      );
    });
  }

  async function download() {
    const file = await toFile();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function share() {
    const file = await toFile();
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: t.colonist.inviteShareText, url: inviteUrl });
      } catch {
        // annullato dall'utente
      }
      return;
    }
    void download();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto w-full max-w-[280px]">
        <canvas
          ref={ref}
          width={W}
          height={H}
          className="poly h-auto w-full bg-black/40"
          aria-label={t.colonist.cardTitle}
        />
        {!ready && (
          <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs uppercase tracking-wider opacity-70">
            {t.colonist.cardPreparing}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-ghost" disabled={!ready} onClick={download}>
          {t.colonist.cardDownload}
        </button>
        <button type="button" className="btn" disabled={!ready} onClick={share}>
          {t.colonist.cardShare}
        </button>
      </div>
    </div>
  );
}
