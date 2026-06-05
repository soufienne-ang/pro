import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/i18n/config";
import { getToken } from "next-auth/jwt";

const STAFF_ROLES = ["SUPER_ADMIN", "HR_AGENT", "JURY_MEMBER", "REVIEWER", "COMMISSION"] as const;

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
});

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|map|txt|xml|woff2?)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );

  if (!hasLocale) {
    return intlMiddleware(req);
  }

  const locale =
    locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)) ??
    defaultLocale;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (pathname.startsWith(`/${locale}/admin`)) {
    if (!token?.role || !STAFF_ROLES.includes(token.role as (typeof STAFF_ROLES)[number])) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
  }

  if (pathname.includes("/dashboard") && token?.role === "CANDIDATE") {
    if (!token.isEmailVerified) {
      return NextResponse.redirect(new URL(`/${locale}/verify-email`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
