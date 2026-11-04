import { getCommerce } from "@/lib/commerce";
import { searchScore } from "@/lib/commerce/query";
import { isLocale } from "@/lib/i18n/config";
import { handleError, json } from "@/lib/api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const localeParam = url.searchParams.get("locale");
  const locale = isLocale(localeParam) ? localeParam : "vi";
  if (q.length < 2) return json({ products: [], categories: [] });
  try {
    const commerce = getCommerce();
    const [page, categories] = await Promise.all([
      commerce.queryProducts({ locale, search: q, pageSize: 50 }),
      commerce.listCategories(locale),
    ]);
    const products = [...page.items]
      .sort((a, b) => searchScore(b, q) - searchScore(a, q))
      .slice(0, 6)
      .map((p) => ({ handle: p.handle, name: p.name.value, lang: p.name.lang, price: Math.min(...p.variants.map((v) => v.price)), image: p.images[0]?.url ?? null }));
    const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
    const cats = categories.filter((c) => norm(c.name.value).includes(norm(q))).slice(0, 4).map((c) => ({ handle: c.handle, name: c.name.value }));
    return json({ products, categories: cats }, 200, { "Cache-Control": "public, max-age=30" });
  } catch (e) {
    return handleError(e, "suggest");
  }
}
