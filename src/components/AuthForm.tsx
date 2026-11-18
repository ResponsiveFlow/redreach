"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/GoogleIcon";
import { isInAppBrowser } from "@/lib/inapp";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { ZONE_COOKIE, type Zone } from "@/lib/zones";

type View = "signup" | "login" | "forgot" | "code" | "reset";

const MIN_PASSWORD = 8;

// Se la webview si ricarica mentre l'utente va a prendere il codice (app Mail, notifica),
// al ritorno ritrova subito il campo del codice con la sua email. La password NON si salva.
const PENDING_KEY = "rr_otp";
const PENDING_TTL_MS = 15 * 60 * 1000;

/** Email in attesa del codice di verifica (stringa vuota se non c'è o è troppo vecchia). */
function readPending(): string {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return "";
    const p = JSON.parse(raw) as { email?: string; ts?: number };
    if (typeof p.email !== "string" || typeof p.ts !== "number" || Date.now() - p.ts > PENDING_TTL_MS) {
      localStorage.removeItem(PENDING_KEY);
      return "";
    }
    return p.email;
  } catch {
    return "";
  }
}
function setZoneCookie(zone: Zone) {
  document.cookie = `${ZONE_COOKIE}=${zone}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}
function savePending(email: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ email, ts: Date.now() }));
  } catch {}
}
function clearPending() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
}

/**
 * Registrazione (email + password, codice di verifica una sola volta), accesso con password,
 * recupero password con codice, e Google fuori dai browser in-app.
 * `next`: dove andare dopo l'accesso. `initialMode`: da dove si parte.
 */
export function AuthForm({
  zone,
  next,
  initialMode,
}: {
  zone?: Zone;
  next: string;
  initialMode: "signup" | "login";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  // null sul server e durante l'idratazione, poi l'email salvata (se c'è).
  const pending = useSyncExternalStore(() => () => {}, readPending, () => null);
  const [override, setView] = useState<View | null>(null);
  const view: View = override ?? (initialMode === "signup" && pending ? "code" : initialMode);

  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const typed = emailInput.trim().toLowerCase();
  // Nel passo del codice l'email può arrivare dal salvataggio (dopo un ricaricamento).
  const codeAddress = typed || pending || "";

  // null sul server e durante l'idratazione: Google non compare mai nei browser in-app.
  const inApp = useSyncExternalStore(
    () => () => {},
    () => isInAppBrowser(navigator.userAgent),
    () => null,
  );
  const verifying = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function go(v: View) {
    setError(null);
    setCode("");
    setView(v);
  }

  function done() {
    clearPending();
    router.replace(next);
    router.refresh();
  }

  const tooMany = (status?: number) => status === 429;

  // ---------------------------------------------------------------- registrazione
  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !consent) return;
    if (password.length < MIN_PASSWORD) return setError(t.signup.errPasswordShort);
    setBusy(true);
    setError(null);
    if (zone) setZoneCookie(zone);
    const { data, error: err } = await supabase.auth.signUp({
      email: typed,
      password,
      options: zone ? { data: { zone } } : undefined,
    });
    setBusy(false);
    if (err) {
      setError(
        tooMany(err.status)
          ? t.signup.errTooMany
          : err.code === "weak_password"
            ? t.signup.errPasswordShort
            : t.signup.errSend,
      );
      return;
    }
    // Supabase non dà errore se l'email esiste già: l'utente torna senza "identities".
    if (data.user && data.user.identities?.length === 0) return setError(t.signup.errExists);
    if (data.session) return done(); // verifica email disattivata nel progetto
    savePending(typed);
    setView("code");
    setCooldown(30);
  }

  async function verifySignup(token: string) {
    if (verifying.current) return;
    verifying.current = true;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email: codeAddress, token, type: "signup" });
    if (err) {
      setBusy(false);
      verifying.current = false;
      setCode("");
      setError(t.signup.errCode);
      return;
    }
    done();
  }

  async function resendSignupCode() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resend({ type: "signup", email: codeAddress });
    setBusy(false);
    if (err) return setError(tooMany(err.status) ? t.signup.errTooMany : t.signup.errSend);
    setCooldown(30);
  }

  // ---------------------------------------------------------------- accesso
  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: typed, password });
    if (!err) return done();
    if (err.code === "email_not_confirmed") {
      // Registrato ma mai verificato: rimandiamo il codice e passiamo a inserirlo.
      await supabase.auth.resend({ type: "signup", email: typed });
      savePending(typed);
      setBusy(false);
      setView("code");
      setCooldown(30);
      setError(t.signup.errNotConfirmed);
      return;
    }
    setBusy(false);
    setError(tooMany(err.status) ? t.signup.errTooMany : t.signup.errLogin);
  }

  // ---------------------------------------------------------------- password dimenticata
  async function sendResetCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || !typed) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(typed);
    setBusy(false);
    if (err) return setError(tooMany(err.status) ? t.signup.errTooMany : t.signup.errSend);
    setView("reset");
    setCooldown(30);
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (busy || code.length !== 6) return;
    if (password.length < MIN_PASSWORD) return setError(t.signup.errPasswordShort);
    setBusy(true);
    setError(null);
    const { error: verr } = await supabase.auth.verifyOtp({ email: typed, token: code, type: "recovery" });
    if (verr) {
      setBusy(false);
      return setError(t.signup.errCode);
    }
    const { error: uerr } = await supabase.auth.updateUser({ password });
    if (uerr) {
      setBusy(false);
      return setError(uerr.code === "weak_password" ? t.signup.errPasswordShort : t.signup.errSend);
    }
    done();
  }

  // ---------------------------------------------------------------- Google
  async function google() {
    if (view === "signup" && !consent) return;
    if (zone) setZoneCookie(zone);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  // ---------------------------------------------------------------- pezzi di interfaccia
  const errorBox = error && (
    <p role="alert" className="text-sm font-bold text-orange">
      {error}
    </p>
  );

  const emailField = (
    <input
      className="field"
      type="email"
      inputMode="email"
      autoComplete="email"
      placeholder={t.signup.emailPlaceholder}
      required
      aria-label={t.signup.emailLabel}
      value={emailInput}
      onChange={(e) => setEmailInput(e.target.value)}
    />
  );

  const passwordField = (label: string, autoComplete: "new-password" | "current-password", hint?: boolean) => (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          className="field pr-24"
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={label}
          aria-label={label}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-bold uppercase tracking-wider opacity-80"
          onClick={() => setShowPassword((s) => !s)}
        >
          {showPassword ? t.signup.hidePassword : t.signup.showPassword}
        </button>
      </div>
      {hint && <p className="text-xs opacity-70">{t.signup.passwordHint}</p>}
    </div>
  );

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

  const googleBlock = (needsConsent: boolean) => (
    <>
      {inApp === false && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest opacity-60">
            <span className="h-px flex-1 bg-current" /> {t.signup.or} <span className="h-px flex-1 bg-current" />
          </div>
          <button type="button" className="btn btn-ghost" disabled={needsConsent && !consent} onClick={google}>
            <GoogleIcon />
            {t.signup.google}
          </button>
        </>
      )}
      {inApp === true && <p className="text-xs opacity-70">{t.signup.inAppHint}</p>}
    </>
  );

  const codeInput = (
    <input
      className="field text-center font-display text-3xl tracking-[.4em]"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      placeholder="••••••"
      autoFocus={view === "code"}
      aria-label={t.signup.codeLabel}
      value={code}
      disabled={busy}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 6);
        setCode(v);
        if (view === "code" && v.length === 6) void verifySignup(v);
      }}
    />
  );

  const linkButton = (label: string, onClick: () => void) => (
    <button type="button" className="text-sm underline" onClick={onClick}>
      {label}
    </button>
  );

  // ---------------------------------------------------------------- viste
  if (view === "code") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">{fmt(t.signup.codeSent, { email: codeAddress })}</p>
        {codeInput}
        {errorBox}
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy || cooldown > 0}
          onClick={() => void resendSignupCode()}
        >
          {cooldown > 0 ? fmt(t.signup.resendIn, { s: cooldown }) : t.signup.resend}
        </button>
        {linkButton(t.signup.changeEmail, () => {
          clearPending();
          setEmailInput(codeAddress);
          go("signup");
        })}
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <form onSubmit={sendResetCode} className="flex flex-col gap-4">
        <h2 className="font-display text-2xl">{t.signup.forgotTitle}</h2>
        <p className="text-sm opacity-80">{t.signup.forgotText}</p>
        {emailField}
        {errorBox}
        <button className="btn" disabled={busy || !typed}>
          {busy ? t.signup.sending : t.signup.sendResetCode}
        </button>
        {linkButton(t.signup.backToLogin, () => go("login"))}
      </form>
    );
  }

  if (view === "reset") {
    return (
      <form onSubmit={submitReset} className="flex flex-col gap-4">
        <p className="text-sm">{fmt(t.signup.resetSent, { email: typed })}</p>
        {codeInput}
        {passwordField(t.signup.newPassword, "new-password", true)}
        {errorBox}
        <button className="btn" disabled={busy || code.length !== 6 || !password}>
          {busy ? t.signup.saving : t.signup.savePassword}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy || cooldown > 0}
          onClick={() => void sendResetCode()}
        >
          {cooldown > 0 ? fmt(t.signup.resendIn, { s: cooldown }) : t.signup.resend}
        </button>
        {linkButton(t.signup.backToLogin, () => go("login"))}
      </form>
    );
  }

  if (view === "login") {
    return (
      <form onSubmit={submitLogin} className="flex flex-col gap-4">
        {emailField}
        {passwordField(t.signup.passwordLabel, "current-password")}
        {errorBox}
        <button className="btn" disabled={busy || !typed || !password}>
          {busy ? t.signup.loggingIn : t.signup.logInBtn}
        </button>
        {linkButton(t.signup.forgot, () => go("forgot"))}
        {googleBlock(false)}
        {initialMode === "login" ? (
          <Link href="/zone" className="text-sm underline">
            {t.signup.newHere}
          </Link>
        ) : (
          linkButton(t.signup.newHere, () => go("signup"))
        )}
      </form>
    );
  }

  // signup
  return (
    <form onSubmit={submitSignup} className="flex flex-col gap-4">
      {emailField}
      {passwordField(t.signup.passwordLabel, "new-password", true)}
      {consentBox}
      {errorBox}
      <button className="btn" disabled={!consent || busy || !typed || !password}>
        {busy ? t.signup.creating : t.signup.createAccount}
      </button>
      {googleBlock(true)}
      {linkButton(t.signup.haveAccount, () => go("login"))}
    </form>
  );
}
