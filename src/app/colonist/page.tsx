import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/server";
import { getSession } from "@/lib/session";

// Versione base: la carta condivisibile e il link invito arrivano al punto 5.
async function Content() {
  const [{ t }, { user, colonist }] = await Promise.all([getDict(), getSession()]);
  if (!user) redirect("/");
  if (!colonist) redirect("/zone");
  return (
    <Shell
      zone={colonist.zone}
      title={fmt(t.colonist.title, { n: colonist.colonist_number })}
      subtitle={fmt(t.colonist.line, {
        zone: t.zones[colonist.zone].name,
        q: colonist.q,
        r: colonist.r,
      })}
    >
      {colonist.colonist_name && (
        <p className="font-display text-2xl" style={{ color: "var(--c)" }}>
          {fmt(t.colonist.named, { name: colonist.colonist_name })}
        </p>
      )}
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
