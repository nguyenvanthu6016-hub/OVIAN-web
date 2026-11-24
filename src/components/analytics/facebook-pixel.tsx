"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { pixelId, track } from "@/lib/analytics/pixel";

/**
 * Loads the Meta Pixel once and reports a page view on every navigation. Next.js moves between
 * pages without reloading, so the snippet's own PageView only covers the first page.
 *
 * `autoConfig false` is deliberate and matters here: left on, Meta reads the checkout form and
 * sends the customer's name, phone and email as Automatic Advanced Matching, and invents its own
 * button-click events. Every event this site reports is written out explicitly below instead.
 *
 * Rendered only when NEXT_PUBLIC_FACEBOOK_PIXEL_ID is set; otherwise nothing reaches the browser.
 */
export function FacebookPixel() {
  const id = pixelId();
  if (!id) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('set','autoConfig',false,'${id}');
fbq('init','${id}');fbq('track','PageView');`}
      </Script>
      {/* Meta's fallback for a visitor with JavaScript off. Plain <img>, not next/image: it must
          stay exactly this request, and it is a 1×1 tracking pixel, not a picture. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          alt=""
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        />
      </noscript>
      <PageViewOnNavigate />
    </>
  );
}

function PageViewOnNavigate() {
  // Only the path: reading the query string here would force every page to render per request.
  const pathname = usePathname();
  // The snippet already reported the page it loaded on; report only the ones after it.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    track("PageView");
  }, [pathname]);
  return null;
}
