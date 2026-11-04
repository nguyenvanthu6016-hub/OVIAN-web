import type { MetadataRoute } from "next";
import { getCommerce } from "@/lib/commerce";
import { getContent } from "@/lib/cms";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

/** Indexable pages only (no cart/checkout/account/search). English URLs are listed only when real English copy exists. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entry = (path: string, enAvailable = true): MetadataRoute.Sitemap[number][] => {
    const languages: Record<string, string> = { vi: `${base}/vi${path}` };
    if (enAvailable) languages.en = `${base}/en${path}`;
    const out: MetadataRoute.Sitemap[number][] = [{ url: `${base}/vi${path}`, alternates: { languages } }];
    if (enAvailable) out.push({ url: `${base}/en${path}`, alternates: { languages } });
    return out;
  };

  const staticPaths = ["", "/products", "/about", "/journal", "/contact", "/store", "/faq", "/policies/giao-hang", "/policies/doi-tra", "/policies/bao-mat", "/policies/dieu-khoan"];
  const urls = staticPaths.flatMap((p) => entry(p));

  try {
    const commerce = getCommerce();
    const [cats, productsEn, posts] = await Promise.all([
      commerce.listCategories("en"),
      commerce.queryProducts({ locale: "en", pageSize: 5000 }),
      getContent().journal("en").catch(() => []),
    ]);
    for (const c of cats) urls.push(...entry(`/spaces/${c.handle}`, c.name.lang === "en"));
    for (const p of productsEn.items) urls.push(...entry(`/products/${p.handle}`, !p.translationMissing));
    for (const post of posts) urls.push(...entry(`/journal/${post.slug}`, post.body.lang === "en"));
  } catch {
    // Backend unavailable: publish the static part only rather than failing the sitemap.
  }
  return urls;
}
