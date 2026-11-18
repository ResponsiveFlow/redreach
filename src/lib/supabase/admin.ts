import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/** Client con service role: salta la RLS. Solo server, solo dopo `requireAdmin()`. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
