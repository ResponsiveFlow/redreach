import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Chakra_Petch, Inter } from "next/font/google";
import { CookieNotice } from "@/components/CookieNotice";
import { I18nProvider } from "@/lib/i18n/client";
import { getDict } from "@/lib/i18n/server";
import { en } from "@/lib/i18n/en";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"] });
const display = Chakra_Petch({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "700",
});

// Metadata statici in inglese (lingua di default). TODO: versione per lingua.
export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://playredreach.com"),
};

export const viewport: Viewport = { themeColor: "#120b14" };

/** Legge la lingua della richiesta e la rende disponibile ai componenti client. */
async function Lang({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getDict();
  return (
    <I18nProvider lang={lang} t={t}>
      <CookieNotice />
      {children}
    </I18nProvider>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense>
          <Lang>{children}</Lang>
        </Suspense>
      </body>
    </html>
  );
}
