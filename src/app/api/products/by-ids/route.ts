import { getCommerce } from "@/lib/commerce";
import { isLocale } from "@/lib/i18n/config";
import { handleError, json } from "@/lib/api";

/** Product summaries for client-side lists (wishlist, recently viewed). Public catalogue data only. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 40);
  const localeParam = url.searchParams.get("locale");
  const locale = isLocale(localeParam) ? localeParam : "vi";
  if (!ids.length) return json({ products: [] });
  try {
    const products = await getCommerce().getProductsByIds(ids, locale);
    return json({ products });
  } catch (e) {
    return handleError(e, "by-ids");
  }
}
