import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

/** Redirect un-prefixed paths to /vi or /en (Accept-Language, default vi). */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];
  if (isLocale(first)) return NextResponse.next();
  const accept = req.headers.get("accept-language") ?? "";
  const preferred = /^\s*en\b/i.test(accept) ? "en" : defaultLocale;
  const url = req.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/((?!api|_next|brand|mock|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml|.*\\..*).*)"],
};
