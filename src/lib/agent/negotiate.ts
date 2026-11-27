/**
 * Does this caller want Markdown in preference to HTML?
 *
 * Browsers send a long Accept list ending in a wildcard, so a wildcard must never count as a
 * request for Markdown — only an explicit text/markdown that is at least as welcome as
 * text/html. Getting this wrong serves raw Markdown to a shopper where the shop should be,
 * which is why this lives in its own file with its own tests.
 *
 * Parsed by splitting rather than by one large regular expression: the media ranges are a
 * comma-separated list and reading them as one is how the subtle cases get missed.
 */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;

  /** Highest q offered for an exact media type; -1 when it is not named at all. */
  const quality = (wanted: string): number => {
    let best = -1;
    for (const part of accept.split(",")) {
      const [range, ...params] = part.split(";").map((x) => x.trim());
      if (!range || range.toLowerCase() !== wanted) continue;
      const qParam = params.find((p) => p.toLowerCase().startsWith("q="));
      if (qParam === undefined) {
        best = Math.max(best, 1);
        continue;
      }
      const parsed = Number(qParam.slice(2));
      // A malformed q ("q=abc") is not a weight we can honour; treat it as not asked for.
      if (Number.isFinite(parsed)) best = Math.max(best, parsed);
    }
    return best;
  };

  const markdown = Math.max(quality("text/markdown"), quality("text/x-markdown"));
  if (markdown <= 0) return false;
  // Ties go to Markdown: a browser never names it, so anything that does is an agent.
  return markdown >= Math.max(quality("text/html"), quality("application/xhtml+xml"));
}
