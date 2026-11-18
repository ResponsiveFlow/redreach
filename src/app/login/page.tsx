import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Shell } from "@/components/Shell";
import { getDict } from "@/lib/i18n/server";
import { getSession } from "@/lib/session";

/** Solo percorsi interni: niente redirect verso altri siti. */
function safeNext(v: string | string[] | undefined): string {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.startsWith("/") && !s.startsWith("//") ? s : "/colonist";
}

async function Content({ props }: { props: PageProps<"/login"> }) {
  const [sp, { t }, { user }] = await Promise.all([props.searchParams, getDict(), getSession()]);
  const next = safeNext(sp.next);
  if (user) redirect(next);
  return (
    <Shell title={t.login.title} subtitle={t.login.subtitle}>
      <AuthForm next={next} initialMode="login" />
    </Shell>
  );
}

export default function Page(props: PageProps<"/login">) {
  return (
    <Suspense>
      <Content props={props} />
    </Suspense>
  );
}
