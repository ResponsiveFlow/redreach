import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HoldTimer } from "@/components/HoldTimer";
import { NameForm } from "@/components/NameForm";
import { Shell } from "@/components/Shell";
import { SignupForm } from "@/components/SignupForm";
import { HOLD_COOKIE, parseHold } from "@/lib/hold";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/server";
import { getSession } from "@/lib/session";
import { isZone } from "@/lib/zones";

async function Content() {
  const [{ t }, jar, { user, colonist }] = await Promise.all([getDict(), cookies(), getSession()]);
  if (colonist) redirect("/colonist");
  const hold = parseHold(jar.get(HOLD_COOKIE)?.value);
  if (!hold || !isZone(hold.z)) redirect("/zone");

  const slot = { q: hold.q, r: hold.r, zone: t.zones[hold.z].name };
  const back = (
    <Link href={`/zone/${hold.z}`} className="text-sm underline">
      {t.join.backToMap}
    </Link>
  );

  if (!user) {
    return (
      <Shell
        step={3}
        zone={hold.z}
        title={t.join.accountTitle}
        subtitle={fmt(t.join.accountSubtitle, slot)}
      >
        <HoldTimer exp={hold.exp} />
        <SignupForm zone={hold.z} next="/join" />
        {back}
      </Shell>
    );
  }
  return (
    <Shell step={4} zone={hold.z} title={t.join.nameTitle} subtitle={t.join.nameSubtitle}>
      <HoldTimer exp={hold.exp} />
      <NameForm />
      {back}
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
