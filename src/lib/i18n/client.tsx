"use client";

import { createContext, useContext, useEffect } from "react";
import type { Dict, Lang } from "./index";

const Ctx = createContext<{ lang: Lang; t: Dict } | null>(null);

export function I18nProvider({
  lang,
  t,
  children,
}: {
  lang: Lang;
  t: Dict;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <Ctx.Provider value={{ lang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n fuori da I18nProvider");
  return v;
}
