"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";
import { TRACK_COOKIE, parseTrackingCookie } from "@/lib/tracking";

/** Registra la visita (una per browser al giorno) per la conversione visita → prenotazione. */
export function VisitLogger() {
  const { lang } = useI18n();
  useEffect(() => {
    try {
      if (sessionStorage.getItem("rr_visit")) return;
      sessionStorage.setItem("rr_visit", "1");
      let vid = localStorage.getItem("rr_vid");
      if (!vid) {
        vid = crypto.randomUUID();
        localStorage.setItem("rr_vid", vid);
      }
      const m = document.cookie.match(new RegExp(`(?:^|; )${TRACK_COOKIE}=([^;]+)`));
      const src = parseTrackingCookie(m?.[1])?.src ?? "altro";
      void createClient().rpc("log_visit", { p_visitor: vid, p_source: src, p_lang: lang });
    } catch {
      // storage bloccato (webview, modalità privata): niente tracciamento, nessun errore
    }
  }, [lang]);
  return null;
}
