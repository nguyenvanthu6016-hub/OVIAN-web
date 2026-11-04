import type { StoreInfo } from "@/lib/cms/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Notice } from "@/components/ui/primitives";

export function StoreCard({ store, dict }: { store: StoreInfo | null; dict: Pick<Dictionary, "pages" | "common" | "checkout"> }) {
  if (!store) return <Notice>{dict.checkout.storeInfoMissing}</Notice>;
  return (
    <div className="rounded-lg bg-surface-alt p-6">
      {store.sample ? <p className="mb-3 text-caption text-green">{dict.common.mockBadge}</p> : null}
      <h2 lang={store.name.lang} className="text-subheading">{store.name.value}</h2>
      <dl className="mt-4 grid gap-3 text-small sm:grid-cols-[8rem_1fr]">
        <dt className="text-ink-muted">{dict.pages.address}</dt>
        <dd>{store.address}</dd>
        <dt className="text-ink-muted">{dict.pages.phone}</dt>
        <dd>{store.phone.match(/^[+\d\s.-]+$/) ? <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="text-green underline underline-offset-4">{store.phone}</a> : store.phone}</dd>
        {store.email ? (<><dt className="text-ink-muted">{dict.pages.email}</dt><dd><a href={`mailto:${store.email}`} className="text-green underline underline-offset-4">{store.email}</a></dd></>) : null}
        <dt className="text-ink-muted">{dict.pages.hours}</dt>
        <dd>{store.hours.map((h, i) => <span key={i} lang={h.lang} className="block">{h.value}</span>)}</dd>
      </dl>
      {store.mapUrl ? <a href={store.mapUrl} rel="noopener noreferrer" target="_blank" className="mt-4 inline-block text-small font-semibold text-green underline underline-offset-4">Google Maps</a> : null}
    </div>
  );
}
