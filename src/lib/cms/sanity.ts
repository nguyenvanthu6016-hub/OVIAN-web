import "server-only";
import type { Locale } from "@/lib/i18n/config";
import type { LocalizedText } from "@/lib/commerce/types";
import type { ShippingRuleSet } from "@/lib/checkout/shipping";
import type { ContentBlock, ContentProvider, LocalizationIndex, LocalizedBlocks } from "./types";

/**
 * Sanity content over the HTTP GROQ API (no SDK needed). Schemas live in /studio.
 * Localised fields are objects { vi, en }. Missing `en` falls back to `vi` and is marked lang="vi".
 */

interface Cfg { projectId: string; dataset: string; apiVersion: string; token?: string }
function cfg(): Cfg {
  const projectId = process.env.SANITY_PROJECT_ID;
  if (!projectId) throw new Error("SANITY_PROJECT_ID is not configured");
  return {
    projectId,
    dataset: process.env.SANITY_DATASET || "production",
    apiVersion: process.env.SANITY_API_VERSION || "2025-02-19",
    token: process.env.SANITY_READ_TOKEN || undefined,
  };
}

async function groq<T>(query: string, params: Record<string, string> = {}, revalidate = 600): Promise<T> {
  const c = cfg();
  const host = c.token ? "api.sanity.io" : "apicdn.sanity.io";
  const qs = new URLSearchParams({ query });
  for (const [k, v] of Object.entries(params)) qs.set(`$${k}`, JSON.stringify(v));
  const res = await fetch(`https://${c.projectId}.${host}/v${c.apiVersion}/data/query/${c.dataset}?${qs}`, {
    headers: c.token ? { Authorization: `Bearer ${c.token}` } : {},
    next: { revalidate, tags: ["content"] },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Sanity query failed: HTTP ${res.status}`);
  return ((await res.json()) as { result: T }).result;
}

type Loc<T = string> = { vi?: T; en?: T } | null | undefined;

function lt(v: Loc, locale: Locale): LocalizedText | null {
  if (!v) return null;
  if (locale === "en" && v.en) return { value: v.en, lang: "en" };
  if (v.vi) return { value: v.vi, lang: "vi" };
  return v.en ? { value: v.en, lang: "en" } : null;
}
const req = (v: Loc, locale: Locale): LocalizedText => lt(v, locale) ?? { value: "", lang: locale };

interface PtSpan { text?: string }
interface PtBlock { _type: string; style?: string; listItem?: string; children?: PtSpan[] }

/** Portable Text → our minimal block model (headings, paragraphs, bullet lists). */
export function portableToBlocks(pt: PtBlock[] | undefined): ContentBlock[] {
  const out: ContentBlock[] = [];
  for (const b of pt ?? []) {
    if (b._type !== "block") continue;
    const text = (b.children ?? []).map((c) => c.text ?? "").join("");
    if (b.listItem) {
      const last = out.at(-1);
      if (last?.type === "ul") last.items.push(text);
      else out.push({ type: "ul", items: [text] });
    } else if (b.style === "h2") out.push({ type: "h2", text });
    else if (b.style === "h3") out.push({ type: "h3", text });
    else if (text.trim()) out.push({ type: "p", text });
  }
  return out;
}

function blocks(v: Loc<PtBlock[]>, locale: Locale): LocalizedBlocks {
  if (locale === "en" && v?.en?.length) return { blocks: portableToBlocks(v.en), lang: "en" };
  return { blocks: portableToBlocks(v?.vi), lang: "vi" };
}

const img = `{"url": asset->url, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height, alt}`;

export const sanityProvider: ContentProvider = {
  mode: "sanity",
  async siteSettings(locale) {
    const r = await groq<{
      contactEmail?: string; contactPhone?: string; social?: { label: string; url: string }[];
      store?: { _id: string; name: Loc; address?: string; phone?: string; email?: string; hours?: Loc[]; mapUrl?: string } | null;
    } | null>(`*[_type=="siteSettings"][0]{contactEmail, contactPhone, social, "store": pickupStore->{_id, name, address, phone, email, hours, mapUrl}}`);
    return {
      contactEmail: r?.contactEmail,
      contactPhone: r?.contactPhone,
      social: r?.social ?? [],
      store: r?.store && r.store.address
        ? {
            id: r.store._id,
            name: req(r.store.name, locale),
            address: r.store.address,
            phone: r.store.phone ?? "",
            email: r.store.email,
            hours: (r.store.hours ?? []).map((h) => req(h, locale)),
            mapUrl: r.store.mapUrl,
            sample: false,
          }
        : null,
    };
  },
  async home(locale) {
    const r = await groq<{ intro?: Loc; collections?: { _id: string; title: Loc; body: Loc; sapoProductIds?: string[] }[]; story?: { title: Loc; body: Loc; image?: { url: string; width: number; height: number; alt?: string } } } | null>(
      `*[_type=="homePage"][0]{intro, "collections": collections[]->{_id, title, body, sapoProductIds}, story{title, body, "image": image${img}}}`,
    );
    return {
      intro: req(r?.intro, locale),
      collections: (r?.collections ?? []).map((c) => ({ id: c._id, title: req(c.title, locale), body: lt(c.body, locale), productIds: c.sapoProductIds ?? [] })),
      story: r?.story
        ? { title: req(r.story.title, locale), body: req(r.story.body, locale), image: r.story.image?.url ? { url: r.story.image.url, width: r.story.image.width, height: r.story.image.height, alt: r.story.image.alt ?? "" } : undefined }
        : null,
    };
  },
  async page(slug, locale) {
    const r = await groq<{ title: Loc; summary: Loc; body: Loc<PtBlock[]>; _updatedAt: string } | null>(
      `*[_type=="infoPage" && slug.current==$slug][0]{title, summary, body, _updatedAt}`,
      { slug },
    );
    return r ? { slug, title: req(r.title, locale), summary: lt(r.summary, locale), body: blocks(r.body, locale), updatedAt: r._updatedAt } : null;
  },
  async journal(locale) {
    const r = await groq<{ slug: string; title: Loc; excerpt: Loc; date: string; category: Loc; body: Loc<PtBlock[]> }[]>(
      `*[_type=="post" && defined(slug.current)] | order(date desc)[0...50]{"slug": slug.current, title, excerpt, date, "category": category->title, body}`,
    );
    return r.map((p) => ({ slug: p.slug, title: req(p.title, locale), excerpt: req(p.excerpt, locale), date: p.date, category: lt(p.category, locale), body: blocks(p.body, locale) }));
  },
  async journalPost(slug, locale) {
    return (await this.journal(locale)).find((p) => p.slug === slug) ?? null;
  },
  async faqs(locale) {
    const r = await groq<{ question: Loc; answer: Loc }[]>(`*[_type=="faq"] | order(order asc){question, answer}`);
    return r.map((f) => ({ question: req(f.question, locale), answer: req(f.answer, locale) }));
  },
  async shippingRules(): Promise<ShippingRuleSet> {
    // Uncached-ish (60 s) because checkout depends on it.
    const r = await groq<{ zones?: { _key: string; label: string; provinceCodes: string[]; fee: number; freeOver?: number | null }[]; fallbackEnabled?: boolean; fallbackFee?: number; fallbackFreeOver?: number | null } | null>(
      `*[_type=="shippingRates"][0]{zones, fallbackEnabled, fallbackFee, fallbackFreeOver}`,
      {},
      60,
    );
    return {
      sample: false,
      rules: (r?.zones ?? []).map((z) => ({ id: z._key, label: z.label, provinceCodes: z.provinceCodes ?? [], fee: z.fee, freeOver: z.freeOver ?? null })),
      fallback: r?.fallbackEnabled && typeof r.fallbackFee === "number" ? { fee: r.fallbackFee, freeOver: r.fallbackFreeOver ?? null } : null,
    };
  },
  async productLocalizations(): Promise<LocalizationIndex> {
    const [products, categories] = await Promise.all([
      groq<{ sapoProductId: string; name: Loc; summary: Loc; description: Loc; attributes?: { key: string; label: Loc; value: Loc }[]; relatedSapoIds?: string[] }[]>(
        `*[_type=="productLocalization" && defined(sapoProductId)]{sapoProductId, name, summary, description, attributes, relatedSapoIds}`,
      ),
      groq<{ handle: string; name: Loc; description: Loc; areaM2?: number }[]>(`*[_type=="categoryLocalization"]{handle, name, description, areaM2}`),
    ]);
    return {
      products: new Map(
        products.map((p) => [
          p.sapoProductId,
          {
            sapoProductId: p.sapoProductId,
            nameVi: p.name?.vi, nameEn: p.name?.en,
            summaryVi: p.summary?.vi, summaryEn: p.summary?.en,
            descriptionVi: p.description?.vi, descriptionEn: p.description?.en,
            attributes: p.attributes?.filter((a) => a.label?.vi && a.value?.vi).map((a) => ({ key: a.key, labelVi: a.label!.vi!, labelEn: a.label?.en, valueVi: a.value!.vi!, valueEn: a.value?.en })),
            relatedSapoIds: p.relatedSapoIds,
          },
        ]),
      ),
      categories: new Map(categories.map((c) => [c.handle, { handle: c.handle, nameEn: c.name?.en, descriptionEn: c.description?.en, areaM2: c.areaM2 }])),
    };
  },
};
