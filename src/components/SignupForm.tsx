"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isInAppBrowser } from "@/lib/inapp";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { ZONE_COOKIE, type Zone } from "@/lib/zones";

type Step = "email" | "code";

/** `next`: dove andare dopo la verifica (il passo successivo del flusso, deciso dalla pagina). */
export function SignupForm({ zone, next }: { zone: Zone; next: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  // null sul server e durante l'idratazione: Google non compare mai nei browser in-app.
  const inApp = useSyncExternalStore(
    () => () => {},
    () => isInAppBrowser(navigator.userAgent),
    () => null,
  );
  const verifying = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function rememberZone() {
    document.cookie = `${ZONE_COOKIE}=${zone}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!consent || busy) return;
    setBusy(true);
    setError(null);
    rememberZone();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, data: { zone } },
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429 ? t.signup.errTooMany : t.signup.errSend,
      );
      return;
    }
    setStep("code");
    setCooldown(30);
  }

  async function verify(token: string) {
    if (verifying.current) return;
    verifying.current = true;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });
    if (error) {
      setBusy(false);
      verifying.current = false;
      setCode("");
      setError(t.signup.errCode);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function google() {
    if (!consent) return;
    rememberZone();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  const consentBox = (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
        className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--radar)]"
      />
      <span>
        {t.signup.consent.split("{link}")[0]}
        <Link href="/privacy" className="underline" target="_blank">
          {t.signup.privacyPolicy}
        </Link>
        {t.signup.consent.split("{link}")[1]}
      </span>
    </label>
  );

  if (step === "code") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          {fmt(t.signup.codeSent, { email })}
        </p>
        <input
          className="field text-center font-display text-3xl tracking-[.4em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="••••••"
          autoFocus
          aria-label={t.signup.codeLabel}
          value={code}
          disabled={busy}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
            if (v.length === 6) verify(v);
          }}
        />
        {error && <p role="alert" className="text-sm font-bold">{error}</p>}
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy || cooldown > 0}
          onClick={() => sendCode()}
        >
          {cooldown > 0 ? fmt(t.signup.resendIn, { s: cooldown }) : t.signup.resend}
        </button>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
        >
          {t.signup.changeEmail}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-4">
      <input
        className="field"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={t.signup.emailPlaceholder}
        required
        aria-label={t.signup.emailLabel}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {consentBox}
      {error && <p role="alert" className="text-sm font-bold">{error}</p>}
      <button className="btn" disabled={!consent || busy || !email}>
        {busy ? t.signup.sending : t.signup.sendCode}
      </button>

      {inApp === false && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest opacity-60">
            <span className="h-px flex-1 bg-current" /> {t.signup.or} <span className="h-px flex-1 bg-current" />
          </div>
          <button type="button" className="btn btn-ghost" disabled={!consent} onClick={google}>
            {t.signup.google}
          </button>
        </>
      )}
      {inApp === true && (
        <p className="text-xs opacity-70">
          {t.signup.inAppHint}
        </p>
      )}
    </form>
  );
}
