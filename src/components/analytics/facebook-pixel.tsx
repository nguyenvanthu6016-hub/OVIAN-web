"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { pixelId, track } from "@/lib/analytics/pixel";

/**
 * Loads the Meta Pixel once and reports a page view on every navigation. Next.js moves between
 * pages without reloading, so the snippet's own PageView only covers the first page.
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
fbq('init','${id}');fbq('track','PageView');`}
      </Script>
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
