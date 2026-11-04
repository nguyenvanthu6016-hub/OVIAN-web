"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/lib/commerce/types";
import { IconClose, IconZoom } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

export function Gallery({ images, labels, activeIndex }: { images: ProductImage[]; labels: { gallery: string; imageOf: string; zoom: string; close: string }; activeIndex?: number }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const current = images[index] ?? images[0];

  // Follow the selected variant image (adjust state during render when the prop changes).
  const [prevActive, setPrevActive] = useState(activeIndex);
  if (prevActive !== activeIndex) {
    setPrevActive(activeIndex);
    if (activeIndex !== undefined && activeIndex < images.length) setIndex(activeIndex);
  }

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (zoom && !d.open) d.showModal();
    if (!zoom && d.open) d.close();
  }, [zoom]);

  if (!current) return <div className="aspect-square rounded-lg bg-surface-alt" />;
  const label = (i: number) => labels.imageOf.replace("{index}", String(i + 1)).replace("{count}", String(images.length));

  return (
    <section aria-label={labels.gallery} className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      <div className="relative flex-1 overflow-hidden rounded-lg bg-surface-alt">
        <Image src={current.url} alt={current.alt} width={current.width} height={current.height} priority sizes="(min-width: 1024px) 55vw, 100vw" unoptimized={current.url.endsWith(".svg")} className="aspect-square w-full object-cover" />
        <button type="button" onClick={() => setZoom(true)} className="absolute bottom-3 right-3 inline-flex size-11 items-center justify-center rounded-full bg-surface/90 text-ink hover:bg-surface cursor-pointer" aria-label={labels.zoom}>
          <IconZoom />
        </button>
      </div>
      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto lg:w-20 lg:flex-col" role="list">
          {images.map((im, i) => (
            <li key={im.url + i} className="shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-label={label(i)} aria-current={i === index} className={cx("block overflow-hidden rounded-md border-2 cursor-pointer", i === index ? "border-green" : "border-transparent hover:border-line-strong")}>
                <Image src={im.url} alt="" width={80} height={80} unoptimized={im.url.endsWith(".svg")} className="size-16 object-cover lg:size-[4.5rem]" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <dialog ref={dialog} onClose={() => setZoom(false)} onClick={(e) => e.target === dialog.current && setZoom(false)} className="m-auto h-[min(92vh,92vw)] w-[min(92vh,92vw)] max-w-none overflow-hidden rounded-lg bg-surface p-0 backdrop:bg-ink/70" aria-label={labels.zoom}>
        {zoom ? (
          <div className="relative size-full">
            <Image src={current.url} alt={current.alt} fill sizes="92vw" unoptimized={current.url.endsWith(".svg")} className="object-contain" />
            <button type="button" autoFocus onClick={() => setZoom(false)} className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink cursor-pointer" aria-label={labels.close}>
              <IconClose />
            </button>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
