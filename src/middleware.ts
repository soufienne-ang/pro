import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const locale = path.startsWith("/ar") ? "ar" : "fr";

    if (path.startsWith("/fr/admin") || path.startsWith("/ar/admin")) {
      if (token?.role !== "SUPER_ADMIN" && token?.role !== "REVIEWER") {
        return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
      }
    }

    if (path.includes("/dashboard") && token?.role === "CANDIDATE") {
      if (!token.isEmailVerified) {
        return NextResponse.redirect(new URL(`/${locale}/verify-email`, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/fr/admin/:path*",
    "/ar/admin/:path*",
    "/fr/dashboard/:path*",
    "/ar/dashboard/:path*",
  ],
};
