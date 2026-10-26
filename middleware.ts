import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

const SUPPORTED_LOCALES = ["en", "ar"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

const MARKETING_PATHS = ["/", "/pricing", "/about"];

function getPreferredLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get("contentech_lang")?.value;
  if (cookie && (SUPPORTED_LOCALES as readonly string[]).includes(cookie)) {
    return cookie as Locale;
  }
  return "en";
}

function hasLocalePrefix(pathname: string): boolean {
  return SUPPORTED_LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
}

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl;

  if (MARKETING_PATHS.includes(pathname) && !hasLocalePrefix(pathname)) {
    const locale = getPreferredLocale(req);
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/pricing",
    "/about",
    "/dashboard/:path*",
    "/portal/:path*",
    "/admin/:path*",
  ],
};
