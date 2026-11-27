import NextLink from "next/link";

/**
 * A link in the site chrome: header, drawer, footer, floor plan.
 *
 * Next prefetches every <Link> that enters the viewport. On the home page that is
 * roughly twenty speculative page renders — including the English translation of
 * the page you are already on — fired at a single shared-hosting Node process
 * before the visitor has clicked anything, all of it competing with the stylesheet
 * and the product photos for the same connection.
 *
 * Chrome links are the ones people reach for deliberately, so the round trip on
 * click is affordable. Links on the shopping path (product cards) keep the default
 * prefetch, because that click is the likely one and the payoff is real.
 */
export function ChromeLink(props: React.ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
