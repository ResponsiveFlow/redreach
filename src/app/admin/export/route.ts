import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Evita che Excel/Sheets eseguano come formula un valore scelto dall'utente. */
function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  await requireAdmin();
  const db = createAdminClient();

  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("colonists")
      .select(
        "id, colonist_number, colonist_name, email, zone, q, r, source, lang, ig_username, tiktok_username, ref_code, referred_by, created_at, sectors(index)",
      )
      .order("colonist_number")
      .range(from, from + 999);
    if (error) return new Response("Export failed", { status: 500 });
    rows.push(...data);
    if (data.length < 1000) break;
  }

  const byId = new Map(rows.map((r) => [r.id as string, r]));
  const invites = new Map<string, number>();
  for (const r of rows) {
    const ref = r.referred_by as string | null;
    if (ref) invites.set(ref, (invites.get(ref) ?? 0) + 1);
  }

  const head = [
    "number", "name", "email", "zone", "sector", "q", "r", "source", "lang",
    "instagram", "tiktok", "ref_code", "invited_by", "invites", "created_at",
  ];
  const lines = rows.map((r) => {
    const sector = r.sectors as { index: number } | null;
    const inviter = r.referred_by ? byId.get(r.referred_by as string) : null;
    return [
      r.colonist_number, r.colonist_name, r.email, r.zone, sector?.index, r.q, r.r, r.source, r.lang,
      r.ig_username, r.tiktok_username, r.ref_code, inviter?.colonist_number ?? "", invites.get(r.id as string) ?? 0,
      r.created_at,
    ].map(cell).join(",");
  });

  const day = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + [head.join(","), ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="redreach-colonists-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
