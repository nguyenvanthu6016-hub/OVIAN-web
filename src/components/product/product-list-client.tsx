"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/commerce/types";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useRecent, useWishlist } from "@/lib/client/stores";
import { ProductGrid } from "./product-card";
import { Skeleton } from "@/components/ui/primitives";

function useProducts(ids: string[], locale: Locale) {
  const key = ids.join(",");
  const [state, setState] = useState<{ key: string; products: Product[] | null; error: boolean }>({ key: "", products: null, error: false });
  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch(`/api/products/by-ids?ids=${encodeURIComponent(key)}&locale=${locale}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { products: Product[] }) => setState({ key, products: d.products, error: false }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setState({ key, products: null, error: true });
      });
    return () => ctrl.abort();
  }, [key, locale]);
  if (!key) return { products: [] as Product[], error: false };
  return state.key === key ? state : { products: null, error: false };
}

export function RecentlyViewed({ locale, dict, excludeId, title }: { locale: Locale; dict: Pick<Dictionary, "product">; excludeId?: string; title: string }) {
  const ids = useRecent().filter((id) => id !== excludeId).slice(0, 4);
  const { products } = useProducts(ids, locale);
  if (!ids.length || (products && !products.length)) return null;
  return (
    <section className="mt-20" aria-labelledby="recent-title">
      <h2 id="recent-title" className="mb-6 text-heading">{title}</h2>
      {products ? <ProductGrid products={products} locale={locale} dict={dict} /> : <GridSkeleton n={ids.length} />}
    </section>
  );
}

export function WishlistGrid({ locale, dict, empty }: { locale: Locale; dict: Pick<Dictionary, "product">; empty: React.ReactNode }) {
  const ids = useWishlist();
  const { products, error } = useProducts(ids, locale);
  if (!ids.length) return <>{empty}</>;
  if (error) return null;
  return products ? <ProductGrid products={products} locale={locale} dict={dict} /> : <GridSkeleton n={Math.min(ids.length, 8)} />;
}

function GridSkeleton({ n }: { n: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {Array.from({ length: n }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
