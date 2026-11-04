import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/cms";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { jsonLd, localizedAlternates } from "@/lib/seo";
import { IconChevronDown } from "@/components/ui/icons";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).pages.faqTitle, ...localizedAlternates(locale, "/faq") } : {};
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const faqs = await getContent().faqs(locale).catch(() => []);
  return (
    <div className="container-page page-x pb-8 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question.value, acceptedAnswer: { "@type": "Answer", text: f.answer.value } })) })} />
      <h1 className="mb-8 text-display">{d.pages.faqTitle}</h1>
      <div className="max-w-3xl divide-y divide-line border-y border-line">
        {faqs.map((f, i) => (
          <details key={i} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              <span lang={f.question.lang}>{f.question.value}</span>
              <IconChevronDown size={18} className="shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-180" />
            </summary>
            <p lang={f.answer.lang} className="max-w-prose pb-5 text-ink">{f.answer.value}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
