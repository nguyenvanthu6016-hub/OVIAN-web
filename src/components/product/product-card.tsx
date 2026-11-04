import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/commerce/types";
import { isAvailable, isOnSale, minPrice } from "@/lib/commerce/query";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { Badge, Price } from "@/components/ui/primitives";
import { WishlistButton } from "./wishlist-button";

export function saleInfo(p: Product) {
  const v = p.variants.find((x) => x.compareAtPrice && x.compareAtPrice > x.price);
  if (!v || !v.compareAtPrice) return null;
  return { price: v.price, compareAt: v.compareAtPrice, percent: Math.round((1 - v.price / v.compareAtPrice) * 100) };
}

/** Brand rule: name, size, material, price — no more than four lines. */
export function ProductCard({ product, locale, dict, priority }: { product: Product; locale: Locale; dict: Pick<Dictionary, "product">; priority?: boolean }) {
  const img = product.images[0];
  const sale = isOnSale(product) ? saleInfo(product) : null;
  const available = isAvailable(product);
  const isNew = product.isNew;
  const dims = product.attributes.find((a) => a.key === "dimensions")?.value.value;
  const material = product.attributes.find((a) => a.key === "material")?.value;
  const multiPrice = new Set(product.variants.map((v) => v.price)).size > 1;
  const href = routes.product(locale, product.handle);

  return (
    <article className="group relative flex flex-col" data-testid="product-card">
      <div className="relative overflow-hidden rounded-md bg-surface-alt">
        <Link href={href} tabIndex={-1} aria-hidden="true">
          {img ? (
            <Image
              src={img.url}
              alt=""
              width={img.width}
              height={img.height}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              priority={priority}
              unoptimized={img.url.endsWith(".svg")}
              className="aspect-square w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
            />
          ) : (
            <div className="aspect-square w-full" />
          )}
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {!available ? <Badge tone="muted">{dict.product.soldOut}</Badge> : sale ? <Badge>{t(dict.product.sale, { percent: sale.percent })}</Badge> : isNew ? <Badge tone="green">{dict.product.newBadge}</Badge> : null}
        </div>
        <div className="absolute right-1.5 top-1.5">
          <WishlistButton productId={product.id} name={product.name.value} labels={{ save: dict.product.save, saved: dict.product.saved }} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-0.5">
        <h3 className="text-small font-semibold text-ink">
          <Link href={href} lang={product.name.lang} className="after:absolute after:inset-0 after:content-[''] hover:text-green focus-visible:outline-none">
            {product.name.value}
          </Link>
        </h3>
        {dims || material ? (
          <p className="text-caption text-ink-muted" lang={material?.lang}>
            {[dims, material?.value].filter(Boolean).join(", ")}
          </p>
        ) : null}
        <p className="mt-1 text-small">
          {multiPrice ? <span className="mr-1 text-ink-muted">{dict.product.from}</span> : null}
          <Price price={sale?.price ?? minPrice(product)} compareAt={sale?.compareAt} locale={locale} labels={{ original: dict.product.originalPrice, sale: dict.product.salePrice }} />
        </p>
      </div>
    </article>
  );
}

export function ProductGrid({ products, locale, dict, priorityCount = 0 }: { products: Product[]; locale: Locale; dict: Pick<Dictionary, "product">; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
      {products.map((p, i) => (
        <li key={p.id} className="relative">
          <ProductCard product={p} locale={locale} dict={dict} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
