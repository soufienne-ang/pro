import type { Metadata } from "next";
import { Inter, Changa } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { ApplicationProvider } from "@/context/application-context";
import { Providers } from "@/components/providers";
import { SiteLayout } from "@/components/site-layout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const changa = Changa({ subsets: ["arabic"], variable: "--font-changa" });

export const metadata: Metadata = {
  title: "PROMOSPORT Recruitment",
  description: "PROMOSPORT Job Application Portal",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`${inter.variable} ${changa.variable}`}>
      <body className={locale === "ar" ? "font-arabic" : "font-sans"}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <ApplicationProvider>
              <SiteLayout>{children}</SiteLayout>
            </ApplicationProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}