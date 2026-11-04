import Image from "next/image";

/**
 * Official OVIAN logotype (PNG from the brand folder, 767×254). Never retyped or recoloured.
 * Variant must match the background per the guideline: green on light, yellow/white on green.
 * Clear space (1X ≈ 13% of logo height) is provided by the padding wrapper.
 */
export function Logo({ variant = "green", width = 112, priority, alt = "OVIAN" }: { variant?: "green" | "yellow" | "white"; width?: number; priority?: boolean; alt?: string }) {
  const w = Math.max(100, width); // guideline: minimum 100px on web
  const h = Math.round((w * 254) / 767);
  return (
    <span className="inline-block" style={{ padding: Math.round(h * 0.13) }}>
      <Image src={`/brand/ovian-logo-${variant}.png`} alt={alt} width={w} height={h} priority={priority} style={{ width: w, height: h }} />
    </span>
  );
}
