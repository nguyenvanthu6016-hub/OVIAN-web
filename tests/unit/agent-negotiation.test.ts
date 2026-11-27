import { describe, expect, it } from "vitest";

/**
 * The Accept parsing that decides whether a caller gets Markdown instead of the shop.
 *
 * This is the one piece of agent-readiness that can break the site for real customers: a browser
 * handed Markdown sees raw text where the shop should be. Every real browser string below must
 * come back false.
 */
import { prefersMarkdown } from "@/lib/agent/negotiate";

const BROWSERS = [
  // Chrome / Edge
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  // Firefox
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  // Safari
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  // curl, and anything that just wants whatever
  "*/*",
];

describe("a browser never gets Markdown", () => {
  it.each(BROWSERS)("%s", (accept) => {
    expect(prefersMarkdown(accept)).toBe(false);
  });

  it("ignores a missing or empty Accept header", () => {
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown("")).toBe(false);
  });

  it("does not treat a wildcard as a request for Markdown", () => {
    expect(prefersMarkdown("*/*;q=1.0")).toBe(false);
    expect(prefersMarkdown("text/*")).toBe(false);
  });
});

describe("an agent that asks for Markdown gets it", () => {
  it.each([
    "text/markdown",
    "text/markdown, text/plain;q=0.9",
    "text/markdown;q=1.0, text/html;q=0.5",
    "TEXT/MARKDOWN",
    "text/x-markdown",
    "application/json;q=0.5, text/markdown;q=0.9",
  ])("%s", (accept) => {
    expect(prefersMarkdown(accept)).toBe(true);
  });

  it("serves Markdown when it ties with HTML, since only an agent names it at all", () => {
    expect(prefersMarkdown("text/markdown,text/html")).toBe(true);
  });

  it("respects a caller that names Markdown but prefers HTML", () => {
    expect(prefersMarkdown("text/html,text/markdown;q=0.5")).toBe(false);
    expect(prefersMarkdown("text/html;q=0.9,text/markdown;q=0.8")).toBe(false);
  });

  it("is not fooled by a q value that is not a number", () => {
    expect(prefersMarkdown("text/markdown;q=abc")).toBe(false);
  });
});
