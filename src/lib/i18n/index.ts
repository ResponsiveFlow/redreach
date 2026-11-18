import { en, type Dict } from "./en";
import { it } from "./it";

export const LANGS = ["en", "it"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "rr_lang";
export const LANG_HEADER = "x-rr-lang";

export const DICTS: Record<Lang, Dict> = { en, it };

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

/** Prima lingua supportata nell'header Accept-Language, altrimenti null. */
export function langFromAcceptLanguage(header: string | null): Lang | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const code = part.split(";")[0].trim().toLowerCase().slice(0, 2);
    if (isLang(code)) return code;
  }
  return null;
}

/** Sostituisce {chiave} nei testi. */
export function fmt(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export type { Dict };
