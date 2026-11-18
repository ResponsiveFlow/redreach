import { Countdown } from "@/components/Countdown";
import { getCountdown } from "@/lib/data";

/** Legge il countdown dal database (in cache 60 s). Spento → non rende nulla. */
export async function CountdownBar() {
  const endsAt = await getCountdown();
  return endsAt ? <Countdown endsAt={endsAt} /> : null;
}
