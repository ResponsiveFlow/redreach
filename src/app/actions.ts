"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HOLD_COOKIE, SID_COOKIE, parseHold } from "@/lib/hold";
import { getDict } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { TRACK_COOKIE, parseTrackingCookie } from "@/lib/tracking";
import { isZone } from "@/lib/zones";

/**
 * Chiude la registrazione: assegna lo slot bloccato e il nome (facoltativo).
 * Tutto avviene in una transazione sul DB (`complete_registration`).
 */
export async function registerAction(name: string | null): Promise<{ error: string }> {
  const [jar, { t, lang }] = await Promise.all([cookies(), getDict()]);
  const hold = parseHold(jar.get(HOLD_COOKIE)?.value);
  const sid = jar.get(SID_COOKIE)?.value;
  if (!hold || !isZone(hold.z) || !sid) redirect("/zone");
  const track = parseTrackingCookie(jar.get(TRACK_COOKIE)?.value);

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_registration", {
    p_session: sid,
    p_sector: hold.s,
    p_q: hold.q,
    p_r: hold.r,
    p_name: name?.trim() || undefined,
    p_source: track?.src ?? "altro",
    p_ref: track?.ref ?? undefined,
    p_ig: track?.ig ?? undefined,
    p_lang: lang,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("name_taken")) return { error: t.join.errNameTaken };
    if (msg.includes("invalid_name")) return { error: t.join.errInvalidName };
    if (msg.includes("slot_taken") || msg.includes("slot_invalid")) {
      jar.delete(HOLD_COOKIE);
      redirect(`/zone/${hold.z}?e=taken`);
    }
    return { error: t.join.errGeneric };
  }
  jar.delete(HOLD_COOKIE);
  redirect("/colonist");
}
