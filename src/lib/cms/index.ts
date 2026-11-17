import "server-only";
import type { ContentMode, ContentProvider } from "./types";
import { sanityProvider } from "./sanity";
import { ovianFaqs, ovianHome, ovianJournal, ovianPage, ovianShippingRules, ovianSiteSettings } from "./ovian-content";
import { mockFaqs, mockHome, mockJournal, mockPage, mockShippingRules, mockSiteSettings } from "./sample-content";

/** OVIAN's own content, kept in code (the owner edits it through a developer, not a CMS). */
const ovianContent: ContentProvider = {
  mode: "ovian",
  async siteSettings(locale) { return ovianSiteSettings(locale); },
  async home(locale) { return ovianHome(locale); },
  async page(slug, locale) { return ovianPage(slug, locale); },
  async journal(locale) { return ovianJournal(locale); },
  async journalPost(slug, locale) { return ovianJournal(locale).find((p) => p.slug === slug) ?? null; },
  async faqs(locale) { return ovianFaqs(locale); },
  async shippingRules() { return ovianShippingRules; },
  async productLocalizations() { return { products: new Map(), categories: new Map() }; },
};

/** Sample copy for the automated tests only (CONTENT_MODE=sample). */
const sampleContent: ContentProvider = {
  mode: "sample",
  async siteSettings(locale) { return mockSiteSettings(locale); },
  async home(locale) { return mockHome(locale); },
  async page(slug, locale) { return mockPage(slug, locale); },
  async journal(locale) { return mockJournal(locale); },
  async journalPost(slug, locale) { return mockJournal(locale).find((p) => p.slug === slug) ?? null; },
  async faqs(locale) { return mockFaqs(locale); },
  async shippingRules() { return mockShippingRules; },
  async productLocalizations() { return { products: new Map(), categories: new Map() }; },
};

export function contentMode(): ContentMode {
  const v = process.env.CONTENT_MODE;
  return v === "sanity" ? "sanity" : v === "sample" || v === "mock" ? "sample" : "ovian";
}

export function getContent(): ContentProvider {
  switch (contentMode()) {
    case "sanity": return sanityProvider;
    case "sample": return sampleContent;
    default: return ovianContent;
  }
}
