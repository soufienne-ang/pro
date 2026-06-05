import { getRequestConfig } from "next-intl/server";

export const locales = ["ar", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
  };
});