"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import {
  HEX,
  depositDistance,
  hexCenter,
  neighborhood,
  richness,
  type Deposit,
} from "@/lib/hex";
import type { Zone } from "@/lib/zones";

const W = 1080;
const H = 1920;

export type CardNeighbor = { q: number; r: number; label: string };

type Props = {
  number: number;
  name: string | null;
  zone: Zone;
  q: number;
  r: number;
  cols: number;
  rows: number;
  deposits: Deposit[];
  neighbors: CardNeighbor[];
  inviteUrl: string;
};

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Riduce il corpo del testo finché sta nella larghezza data. */
function fit(ctx: CanvasRenderingContext2D, text: string, family: string, size: number, maxW: number) {
  let s = size;
  for (; s > 24; s -= 4) {
    ctx.font = `700 ${s}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
  }
  return s;
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, rad: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i + 30);
    const x = cx + rad * Math.cos(a);
    const y = cy + rad * Math.sin(a);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function drawFlag(ctx: CanvasRenderingContext2D, cx: number, cy: number, k: number, color: string) {
  ctx.strokeStyle = "#ffd3a8";
  ctx.lineWidth = 1.3 * k;
  ctx.beginPath();
  ctx.moveTo(cx - 3 * k, cy + 7 * k);
  ctx.lineTo(cx - 3 * k, cy - 8 * k);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - 3 * k, cy - 8 * k);
  ctx.lineTo(cx + 7 * k, cy - 4.5 * k);
  ctx.lineTo(cx - 3 * k, cy - 1 * k);
  ctx.closePath();
  ctx.fill();
}

async function draw(canvas: HTMLCanvasElement, p: Props, t: ReturnType<typeof useI18n>["t"]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const root = getComputedStyle(document.documentElement);
  const display = root.getPropertyValue("--font-display").trim() || "sans-serif";
  const body = root.getPropertyValue("--font-body").trim() || "sans-serif";
  const zoneColor = root.getPropertyValue(`--${p.zone}`).trim() || "#ffc24b";
  const RADAR = "#5ef2d2";
  const SAND = "#ffd3a8";
  const zoneName = t.zones[p.zone].name;

  await Promise.all([
    document.fonts.load(`700 80px ${display}`),
    document.fonts.load(`700 30px ${body}`),
  ]).catch(() => {});

  // --- sfondo low-poly
  ctx.fillStyle = "#120b14";
  ctx.fillRect(0, 0, W, H);
  const rnd = mulberry32(p.number * 7919 + 2056);
  const step = 130;
  const cols = Math.ceil(W / step) + 2;
  const rows = Math.ceil(H / step) + 2;
  const pts: [number, number][][] = [];
  for (let j = 0; j < rows; j++) {
    pts[j] = [];
    for (let i = 0; i < cols; i++) {
      pts[j][i] = [-step + i * step + (rnd() - 0.5) * 90, -step + j * step + (rnd() - 0.5) * 90];
    }
  }
  const palette = [
    [226, 82, 43],
    [199, 64, 31],
    [169, 53, 26],
    [122, 36, 18],
  ];
  const tri = (a: number[], b: number[], c: number[]) => {
    const base = palette[Math.floor(rnd() * palette.length)];
    const k = 0.16 + rnd() * 0.16;
    ctx.fillStyle = `rgb(${Math.round(base[0] * k)} ${Math.round(base[1] * k)} ${Math.round(base[2] * k)})`;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.closePath();
    ctx.fill();
  };
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      tri(pts[j][i], pts[j][i + 1], pts[j + 1][i]);
      tri(pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]);
    }
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(18,11,20,0.9)");
  g.addColorStop(0.35, "rgba(18,11,20,0.45)");
  g.addColorStop(0.6, "rgba(18,11,20,0.55)");
  g.addColorStop(1, "rgba(18,11,20,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // --- testata
  ctx.fillStyle = "#e2522b";
  ctx.font = `700 84px ${display}`;
  ctx.fillText("RED REACH", W / 2, 170);
  ctx.fillStyle = SAND;
  ctx.globalAlpha = 0.85;
  ctx.font = `700 36px ${body}`;
  ctx.fillText(t.colonist.card.hook, W / 2, 235);
  ctx.globalAlpha = 1;

  // --- identità
  const title = fmt(t.colonist.card.colonist, { n: p.number });
  ctx.fillStyle = SAND;
  ctx.font = `700 ${fit(ctx, title, display, 132, 940)}px ${display}`;
  ctx.fillText(title, W / 2, 470);
  let y = 470;
  if (p.name) {
    y += 100;
    ctx.fillStyle = zoneColor;
    ctx.font = `700 ${fit(ctx, p.name, display, 84, 940)}px ${display}`;
    ctx.fillText(p.name, W / 2, y);
  }
  y += 84;
  const slot = fmt(t.colonist.card.slot, { zone: zoneName.toUpperCase(), q: p.q, r: p.r });
  ctx.fillStyle = zoneColor;
  ctx.font = `700 ${fit(ctx, slot, display, 50, 940)}px ${display}`;
  ctx.fillText(slot, W / 2, y);

  // --- quartiere
  const s = 3.4;
  const ox = W / 2;
  const oy = 1130;
  const [mx, my] = hexCenter(p.q, p.r);
  const taken = new Map(p.neighbors.map((n) => [`${n.q}-${n.r}`, n.label]));
  const rad = HEX * s * 0.93;
  const pos = (q: number, r: number): [number, number] => {
    const [cx, cy] = hexCenter(q, r);
    return [ox + (cx - mx) * s, oy + (cy - my) * s];
  };
  const tierAlpha = { normal: 0.16, good: 0.28, rich: 0.55 } as const;

  for (const { q, r } of neighborhood(p.q, p.r, p.cols, p.rows)) {
    if (q === p.q && r === p.r) continue;
    const [x, yy] = pos(q, r);
    const d = depositDistance(p.deposits, q, r);
    drawHex(ctx, x, yy, rad);
    if (d === 0) {
      ctx.fillStyle = RADAR;
      ctx.globalAlpha = 0.85;
    } else if (taken.has(`${q}-${r}`)) {
      ctx.fillStyle = "#a9351a";
      ctx.globalAlpha = 0.95;
    } else {
      ctx.fillStyle = zoneColor;
      ctx.globalAlpha = tierAlpha[richness(d)];
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    const label = taken.get(`${q}-${r}`);
    if (d !== 0 && label) {
      drawFlag(ctx, x, yy, s, zoneColor);
      ctx.fillStyle = SAND;
      ctx.font = `700 24px ${body}`;
      ctx.fillText(label.length > 9 ? label.slice(0, 8) + "…" : label, x, yy + 13 * s);
    }
  }

  // il tuo slot, in evidenza
  const [px, py] = pos(p.q, p.r);
  drawHex(ctx, px, py, HEX * s * 1.02);
  ctx.fillStyle = "#a9351a";
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = RADAR;
  ctx.stroke();
  drawFlag(ctx, px, py, s * 1.15, zoneColor);
  ctx.fillStyle = RADAR;
  ctx.font = `700 28px ${display}`;
  ctx.fillText(t.colonist.you, px, py + HEX * s * 1.02 + 38);

  // --- invito
  ctx.fillStyle = SAND;
  ctx.font = `700 ${fit(ctx, t.colonist.card.land, display, 104, 940)}px ${display}`;
  ctx.fillText(t.colonist.card.land, W / 2, 1650);
  const shown = p.inviteUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  ctx.fillStyle = RADAR;
  ctx.font = `700 ${fit(ctx, shown, body, 46, 960)}px ${body}`;
  ctx.fillText(shown, W / 2, 1738);
}

/** Carta condivisibile 1080x1920 (storie Instagram/TikTok), generata nel browser. */
export function ShareCard(props: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const { number, name, zone, q, r, cols, rows, deposits, neighbors, inviteUrl } = props;

  useEffect(() => {
    let cancelled = false;
    const canvas = ref.current;
    if (!canvas) return;
    draw(canvas, { number, name, zone, q, r, cols, rows, deposits, neighbors, inviteUrl }, t)
      .then(() => !cancelled && setReady(true))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [number, name, zone, q, r, cols, rows, deposits, neighbors, inviteUrl, t]);

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
