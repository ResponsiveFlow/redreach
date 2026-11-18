import { createClient } from "./supabase/server";

/** Utente (se loggato) e il suo profilo colono (se ha già prenotato uno slot). */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, colonist: null };
  const { data: colonist } = await supabase
    .from("colonists")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, colonist };
}
