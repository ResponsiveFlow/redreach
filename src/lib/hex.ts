/**
 * Geometria della mappa. Griglia di esagoni "odd-r" (punta in su, righe dispari
 * spostate a destra): la stessa convenzione delle funzioni SQL (`hex_distance`).
 * q = colonna, r = riga. L'esagono (0,0) ha il centro in (0,0).
 */
export const HEX = 18; // raggio in unità del mondo
const SQRT3 = Math.sqrt(3);

export type Deposit = { q: number; r: number };
export type Richness = "rich" | "good" | "normal";

const RICH_MAX = 2; // fino a 2 esagoni dal giacimento
const GOOD_MAX = 5;

export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  const x1 = q1 - (r1 - (r1 & 1)) / 2;
  const x2 = q2 - (r2 - (r2 & 1)) / 2;
  return Math.max(Math.abs(x1 - x2), Math.abs(r1 - r2), Math.abs(x1 + r1 - (x2 + r2)));
}

export function depositDistance(deps: Deposit[], q: number, r: number): number {
  let d = Infinity;
  for (const p of deps) d = Math.min(d, hexDistance(q, r, p.q, p.r));
  return d;
}

export function richness(distance: number): Richness {
  return distance <= RICH_MAX ? "rich" : distance <= GOOD_MAX ? "good" : "normal";
}

export function hexCenter(q: number, r: number): [number, number] {
  return [HEX * SQRT3 * (q + (r & 1) / 2), HEX * 1.5 * r];
}

/** Contorno dell'esagono come frammento di path SVG (leggermente ridotto: si vede la griglia). */
export function hexPath(q: number, r: number, scale = 0.93): string {
  const [cx, cy] = hexCenter(q, r);
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i + 30);
    const x = cx + HEX * scale * Math.cos(a);
    const y = cy + HEX * scale * Math.sin(a);
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + "Z";
}

/** Da coordinate del mondo all'esagono sotto quel punto (può cadere fuori dalla griglia). */
export function pointToHex(x: number, y: number): { q: number; r: number } {
  const qa = ((SQRT3 / 3) * x - y / 3) / HEX;
  const ra = ((2 / 3) * y) / HEX;
  const xx = qa;
  const zz = ra;
  const yy = -xx - zz;
  let rx = Math.round(xx);
  const ry = Math.round(yy);
  let rz = Math.round(zz);
  const dx = Math.abs(rx - xx);
  const dy = Math.abs(ry - yy);
  const dz = Math.abs(rz - zz);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy <= dz) rz = -rx - ry;
  return { q: rx + (rz - (rz & 1)) / 2, r: rz };
}

/** Ingombro del settore nel mondo. */
export function sectorBounds(cols: number, rows: number) {
  const minX = -(HEX * SQRT3) / 2;
  const minY = -HEX;
  return {
    minX,
    minY,
    width: HEX * SQRT3 * (cols + 0.5),
    height: HEX * (1.5 * (rows - 1) + 2),
  };
}

export const NEIGHBOR_RADIUS = 4;

/** Esagoni del quartiere: tutti quelli dentro la griglia entro `radius` dallo slot (q,r). */
export function neighborhood(q: number, r: number, cols: number, rows: number, radius = NEIGHBOR_RADIUS) {
  const out: { q: number; r: number }[] = [];
  for (let rr = Math.max(0, r - radius); rr <= Math.min(rows - 1, r + radius); rr++) {
    for (let qq = Math.max(0, q - radius - 1); qq <= Math.min(cols - 1, q + radius + 1); qq++) {
      if (hexDistance(q, r, qq, rr) <= radius) out.push({ q: qq, r: rr });
    }
  }
  return out;
}
