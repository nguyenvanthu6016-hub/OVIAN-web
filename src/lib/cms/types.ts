import type { Locale } from "@/lib/i18n/config";
import type { LocalizedText, ProductImage } from "@/lib/commerce/types";
import type { ShippingRuleSet } from "@/lib/checkout/shipping";

/** Where page content comes from: OVIAN's own content in code, Sanity, or the test samples. */
export type ContentMode = "ovian" | "sanity" | "sample";

/** Minimal rich-text model; Sanity Portable Text is converted into this. */
export type ContentBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export interface LocalizedBlocks {
  blocks: ContentBlock[];
  lang: Locale;
}

export interface StoreInfo {
  id: string;
  name: LocalizedText;
  address: string;
  phone: string;
  email?: string;
  hours: LocalizedText[];
  mapUrl?: string;
  /** true for mock-mode sample data — UI must say so */
  sample: boolean;
}

export interface SiteSettings {
  /** null when OVIAN has no shop customers can visit: the store page and its links disappear. */
  store: StoreInfo | null;
  /** false hides the journal everywhere until there are real posts. */
  showJournal: boolean;
  contactEmail?: string;
  contactPhone?: string;
  /** Phone number behind the Zalo link; usually the same as contactPhone. */
  zaloPhone?: string;
  /** Business details shown in the footer. */
  legal?: { name: LocalizedText; address?: string; taxId?: string };
  social: { label: string; url: string }[];
}

export interface EditorialCollection {
  id: string;
  title: LocalizedText;
  body: LocalizedText | null;
  productIds: string[];
}

export interface HomeContent {
  intro: LocalizedText;
  collections: EditorialCollection[];
  story: { title: LocalizedText; body: LocalizedText; image?: ProductImage } | null;
}

export interface ContentPage {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText | null;
  body: LocalizedBlocks;
  updatedAt?: string;
}

export interface JournalPost {
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  date: string;
  category: LocalizedText | null;
  body: LocalizedBlocks;
  cover?: ProductImage;
}

export interface Faq {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface ProductLocalization {
  sapoProductId: string;
  nameVi?: string;
  nameEn?: string;
  summaryVi?: string;
  summaryEn?: string;
  descriptionVi?: string;
  descriptionEn?: string;
  attributes?: { key: string; labelVi: string; labelEn?: string; valueVi: string; valueEn?: string }[];
  relatedSapoIds?: string[];
}

export interface CategoryLocalization {
  handle: string;
  nameEn?: string;
  descriptionEn?: string;
  areaM2?: number;
  /** Room photo for the floor plan, e.g. "/rooms/phong-ngu.jpg". Falls back to a product photo. */
  imageUrl?: string;
}

export interface LocalizationIndex {
  products: Map<string, ProductLocalization>;
  /** keyed by Sapo collection handle */
  categories: Map<string, CategoryLocalization>;
}

export interface ContentProvider {
  readonly mode: ContentMode;
  siteSettings(locale: Locale): Promise<SiteSettings>;
  home(locale: Locale): Promise<HomeContent>;
  page(slug: string, locale: Locale): Promise<ContentPage | null>;
  journal(locale: Locale): Promise<JournalPost[]>;
  journalPost(slug: string, locale: Locale): Promise<JournalPost | null>;
  faqs(locale: Locale): Promise<Faq[]>;
  shippingRules(): Promise<ShippingRuleSet>;
  productLocalizations(): Promise<LocalizationIndex>;
}
