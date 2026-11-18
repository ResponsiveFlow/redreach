import { cache } from "react";
import { headers } from "next/headers";
import { DEFAULT_LANG, DICTS, LANG_HEADER, isLang, type Lang } from "./index";

/** Lingua della richiesta, decisa dal proxy (?lang → cookie → browser → en). */
export const getLang = cache(async (): Promise<Lang> => {
  const v = (await headers()).get(LANG_HEADER);
  return isLang(v) ? v : DEFAULT_LANG;
});

export async function getDict() {
  const lang = await getLang();
  return { lang, t: DICTS[lang] };
}
