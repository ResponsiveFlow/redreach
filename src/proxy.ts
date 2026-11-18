import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  LANG_HEADER,
  isLang,
  langFromAcceptLanguage,
} from "@/lib/i18n";
import {
  TRACK_COOKIE,
  TRACK_MAX_AGE,
  parseTrackingCookie,
  serializeTracking,
  trackingFromParams,
} from "@/lib/tracking";

// Pagine che richiedono un utente autenticato.
const PROTECTED = ["/colonist", "/admin"];

export async function proxy(request: NextRequest) {
  // 0. Lingua: ?lang=it|en → cookie → lingua del browser → inglese.
  //    La passiamo ai Server Component con un header (il cookie appena creato
  //    non sarebbe ancora visibile nella stessa richiesta).
  const qLang = request.nextUrl.searchParams.get("lang")?.toLowerCase();
  const cookieLang = request.cookies.get(LANG_COOKIE)?.value;
  const lang = isLang(qLang)
    ? qLang
    : isLang(cookieLang)
      ? cookieLang
      : (langFromAcceptLanguage(request.headers.get("accept-language")) ?? DEFAULT_LANG);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LANG_HEADER, lang);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (cookieLang !== lang) {
    response.cookies.set(LANG_COOKIE, lang, {
      maxAge: TRACK_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  // 1. Tracciamento sorgente. Prima visita: salva tutto. Visite successive: la
  //    sorgente resta quella della prima visita, ma completiamo `ref`/`ig` mancanti
  //    e la preselezione `pre` più recente (es. link dal DM dopo una visita senza).
  const incoming = trackingFromParams(request.nextUrl.searchParams);
  if (incoming) {
    const prev = parseTrackingCookie(request.cookies.get(TRACK_COOKIE)?.value);
    const merged = prev
      ? { src: prev.src, ref: prev.ref ?? incoming.ref, ig: prev.ig ?? incoming.ig, pre: incoming.pre ?? prev.pre }
      : incoming;
    if (!prev || JSON.stringify(merged) !== JSON.stringify(prev)) {
      response.cookies.set(TRACK_COOKIE, serializeTracking(merged), {
        maxAge: TRACK_MAX_AGE,
        path: "/",
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      });
    }
  }

  // 2. Refresh della sessione Supabase (solo se esiste già un cookie di auth)
  //    e accesso alle pagine protette con un vero redirect.
  const needsAuth = PROTECTED.includes(request.nextUrl.pathname);
  const hasAuth = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const toLogin = () =>
    NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url),
    );
  if (needsAuth && !hasAuth) {
    return toLogin();
  }
  if (hasAuth) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list) =>
            list.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            ),
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (needsAuth && !user) {
      return toLogin();
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
