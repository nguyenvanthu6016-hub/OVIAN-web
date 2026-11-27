import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { prefersMarkdown } from "@/lib/agent/negotiate";

/**
 * Advertises the machine-readable copies of the site (RFC 8288), so an agent that lands on the
 * HTML does not have to guess that they exist.
 */
function advertise(res: NextResponse, pathname: string): NextResponse {
  const links = [`</llms.txt>; rel="alternate"; type="text/plain"`, `<${`/md${pathname}`}>; rel="alternate"; type="text/markdown"`];
  res.headers.set("Link", links.join(", "));
  // The same URL answers differently depending on Accept; say so, for any cache in between.
  res.headers.append("Vary", "Accept");
  return res;
}

/** Redirect un-prefixed paths to /vi or /en (Accept-Language, default vi). */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];

  if (isLocale(first)) {
    if (prefersMarkdown(req.headers.get("accept"))) {
      const url = req.nextUrl.clone();
      url.pathname = `/md${pathname}`;
      return NextResponse.rewrite(url);
    }
    return advertise(NextResponse.next(), pathname);
  }

  const accept = req.headers.get("accept-language") ?? "";
  const preferred = /^\s*en\b/i.test(accept) ? "en" : defaultLocale;
  const url = req.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  // "md" is excluded: it is the rewrite target, and routing it back through here would send
  // /md/vi/... off to /vi/md/vi/...
  matcher: ["/((?!api|md|_next|brand|mock|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml|.*\\..*).*)"],
};
