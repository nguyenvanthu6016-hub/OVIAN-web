"use client";

import { useParams } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { Button, ButtonLink } from "@/components/ui/primitives";

function useLocale(): Locale {
  const p = useParams<{ locale?: string }>();
  return isLocale(p?.locale) ? p.locale : "vi";
}

export function NotFoundView() {
  const locale = useLocale();
  const d = getDictionary(locale);
  return (
    <div className="container-page page-x py-20">
      <p className="text-caption text-ink-muted">404</p>
      <h1 className="mt-2 text-display">{d.errors.notFoundTitle}</h1>
      <p className="mt-3 max-w-prose text-ink">{d.errors.notFoundBody}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={routes.home(locale)}>{d.errors.goHome}</ButtonLink>
        <ButtonLink href={routes.products(locale)} variant="secondary">{d.common.allProducts}</ButtonLink>
      </div>
    </div>
  );
}

export function ErrorView({ reset }: { reset: () => void }) {
  const locale = useLocale();
  const d = getDictionary(locale);
  return (
    <div className="container-page page-x py-20">
      <h1 className="text-display">{d.errors.genericTitle}</h1>
      <p className="mt-3 max-w-prose text-ink">{d.errors.genericBody}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>{d.common.retry}</Button>
        <ButtonLink href={routes.home(locale)} variant="secondary">{d.errors.goHome}</ButtonLink>
      </div>
    </div>
  );
}
