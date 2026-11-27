import { renderMarkdown } from "@/lib/agent/markdown";
import { siteUrl } from "@/lib/seo";

/**
 * The Markdown rendering of a page, reached either at /md/vi/... or — via the proxy — at the
 * page's own URL when the caller asks for text/markdown.
 *
 * Deliberately not cached. The shop sits behind a CDN that serves one copy of a URL to everyone,
 * and a Markdown body cached under the HTML page's URL would be handed to a shopper's browser.
 * Marking it no-store keeps the two apart whatever the CDN does with Vary.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = await renderMarkdown(slug);
  if (!page) {
    return new Response(`Không có bản Markdown cho trang này. Xem ${siteUrl()}/llms.txt`, {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return new Response(page.body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Accept",
      Link: `<${page.canonical}>; rel="canonical", <${siteUrl()}/llms.txt>; rel="alternate"; type="text/plain"`,
      "X-Robots-Tag": "noindex",
    },
  });
}
