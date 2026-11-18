import Link from "next/link";
import { Shell } from "@/components/Shell";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/server";

// Indirizzo di contatto: da confermare (variabile d'ambiente, con default).
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@playredreach.com";

export default async function Page() {
  const { t } = await getDict();
  return (
    <Shell title={t.privacyPage.title}>
      <div className="flex flex-col gap-4 text-sm opacity-90">
        {t.privacyPage.body.map((p, i) => (
          <p key={i}>{fmt(p, { email: CONTACT })}</p>
        ))}
      </div>
      <Link href="/" className="text-sm underline">
        {t.privacyPage.back}
      </Link>
    </Shell>
  );
}
