import "server-only";
import type { ContentProvider } from "./types";
import { sanityProvider } from "./sanity";
import { mockFaqs, mockHome, mockJournal, mockPage, mockShippingRules, mockSiteSettings } from "./mock-content";

const mockContent: ContentProvider = {
  mode: "mock",
  async siteSettings(locale) { return mockSiteSettings(locale); },
  async home(locale) { return mockHome(locale); },
  async page(slug, locale) { return mockPage(slug, locale); },
  async journal(locale) { return mockJournal(locale); },
  async journalPost(slug, locale) { return mockJournal(locale).find((p) => p.slug === slug) ?? null; },
  async faqs(locale) { return mockFaqs(locale); },
  async shippingRules() { return mockShippingRules; },
  async productLocalizations() { return { products: new Map(), categories: new Map() }; },
};

export function contentMode(): "mock" | "sanity" {
  return process.env.CONTENT_MODE === "sanity" ? "sanity" : "mock";
}

export function getContent(): ContentProvider {
  return contentMode() === "sanity" ? sanityProvider : mockContent;
}
