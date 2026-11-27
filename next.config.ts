import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Meta Pixel hosts, added only when NEXT_PUBLIC_FACEBOOK_PIXEL_ID is set at build time.
 * Without them the browser blocks the pixel outright, which is the usual reason a pixel
 * installed on a site with a strict policy never reports anything.
 */
const pixelOn = !!process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim();
const fbScript = pixelOn ? " https://connect.facebook.net" : "";
const fbConnect = pixelOn ? " https://www.facebook.com https://connect.facebook.net" : "";
const fbImg = pixelOn ? " https://www.facebook.com" : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${fbScript}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://cdn.sanity.io https://*.dktcdn.net https://*.mysapo.net${fbImg}`,
  "font-src 'self'",
  `connect-src 'self'${fbConnect}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  /**
   * The transcribed marketplace reviews are read from disk at runtime, and standalone output only
   * ships files it can see being imported. Without this the folder is missing on Hostinger and
   * every product page quietly loses its reviews.
   */
  outputFileTracingIncludes: {
    "/[locale]/products/[handle]": ["./content/reviews/**"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2_592_000,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "**.dktcdn.net" },
      { protocol: "https", hostname: "**.mysapo.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
