import { NextResponse, type NextRequest } from "next/server";
import { isLang } from "@/lib/i18n";
import { createPublicClient } from "@/lib/supabase/public";
import {
  TRACK_COOKIE,
  TRACK_MAX_AGE,
  parseTrackingCookie,
  serializeTracking,
} from "@/lib/tracking";
import { isZone } from "@/lib/zones";

/**
 * Link d'invito "Land next to me": salva chi ti ha invitato e apre la mappa
 * centrata sullo slot di chi invita. Codice sconosciuto → landing normale.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  const ref = code.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
  const lang = request.nextUrl.searchParams.get("lang");
  const langQuery = isLang(lang) ? `lang=${lang}` : "";

  const { data } = ref
    ? await createPublicClient().rpc("invite_lookup", { p_ref: ref })
    : { data: null };
  const row = data?.[0];
  if (!row || !isZone(row.zone)) {
    return NextResponse.redirect(new URL(`/${langQuery ? `?${langQuery}` : ""}`, request.url));
  }

  const target = `/zone/${row.zone}?sector=${row.sector_id}&focus=${row.q}-${row.r}${langQuery ? `&${langQuery}` : ""}`;
  const response = NextResponse.redirect(new URL(target, request.url));

  // La sorgente della prima visita resta; completiamo il codice invito se manca.
  const prev = parseTrackingCookie(request.cookies.get(TRACK_COOKIE)?.value);
  const merged = prev
    ? { src: prev.src, ref: prev.ref ?? ref, ig: prev.ig, pre: prev.pre ?? row.zone }
    : { src: "ref", ref, ig: null, pre: row.zone };
  response.cookies.set(TRACK_COOKIE, serializeTracking(merged), {
    maxAge: TRACK_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}
