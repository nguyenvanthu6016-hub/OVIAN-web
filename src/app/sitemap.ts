import type { MetadataRoute } from "next";
import { getCommerce } from "@/lib/commerce";
import { getContent } from "@/lib/cms";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

/** Indexable pages only (no cart/checkout/account/search). English URLs are listed only when real English copy exists. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  /**
   * lastmod is emitted only where a real modification date is known: Sapo's modified_on for
   * products, the post date for journal entries. The static pages live in code and carry no
   * edit date, so they get none — a sitemap that claims every page changed today tells a
   * crawler nothing, and tells it falsely.
   */
  const entry = (path: string, enAvailable = true, lastModified?: string | null): MetadataRoute.Sitemap[number][] => {
    const languages: Record<string, string> = { vi: `${base}/vi${path}` };
    if (enAvailable) languages.en = `${base}/en${path}`;
    const when = lastModified && !Number.isNaN(Date.parse(lastModified)) ? { lastModified: new Date(lastModified) } : {};
    const out: MetadataRoute.Sitemap[number][] = [{ url: `${base}/vi${path}`, ...when, alternates: { languages } }];
    if (enAvailable) out.push({ url: `${base}/en${path}`, ...when, alternates: { languages } });
    return out;
  };

  const staticPaths = ["/about", "/journal", "/contact", "/store", "/faq", "/policies/giao-hang", "/policies/doi-tra", "/policies/bao-mat", "/policies/dieu-khoan"];
  const urls = staticPaths.flatMap((p) => entry(p));

  try {
    const commerce = getCommerce();
    const [cats, productsEn, posts] = await Promise.all([
      commerce.listCategories("en"),
      commerce.queryProducts({ locale: "en", pageSize: 5000 }),
      getContent().journal("en").catch(() => []),
    ]);
    // The home page and every listing show the catalogue, so they are as fresh as its newest edit.
    const catalogueTouched = productsEn.items.reduce<string | null>((latest, p) => {
      const t = p.updatedAt ?? p.createdAt;
      return t && (!latest || t > latest) ? t : latest;
    }, null);
    urls.unshift(...entry("", true, catalogueTouched), ...entry("/products", true, catalogueTouched));
    for (const c of cats) urls.push(...entry(`/spaces/${c.handle}`, c.name.lang === "en", catalogueTouched));
    for (const p of productsEn.items) urls.push(...entry(`/products/${p.handle}`, !p.translationMissing, p.updatedAt ?? p.createdAt));
    for (const post of posts) urls.push(...entry(`/journal/${post.slug}`, post.body.lang === "en", post.date));
  } catch {
    // Backend unavailable: publish the static part only rather than failing the sitemap.
    urls.unshift(...entry(""), ...entry("/products"));
  }
  return urls;
}
