/**
 * Sapo gives one long plain-text blob per product, written by the seller with emoji bullets and
 * ad-hoc headings. Rendered as-is it is a wall of text nobody reads on a phone.
 *
 * This turns it into an intro plus named sections the shopper can open when they want the detail.
 * It is deliberately forgiving: a product written without headings still works, and nothing here
 * invents, reorders or drops a word of what the seller wrote.
 */

export interface DescriptionLine {
  /** "label" is a short lead-in the seller clearly meant as a sub-heading; it is shown in bold. */
  kind: "label" | "text";
  text: string;
}

export interface DescriptionSection {
  title: string;
  lines: DescriptionLine[];
}

export interface ParsedDescription {
  /** Shown straight away, above the collapsed sections. */
  intro: DescriptionLine[];
  sections: DescriptionSection[];
}

/** Emoji, bullets and stray punctuation the seller put in front of the words. */
const LEADING_SYMBOLS = /^[^\p{L}\p{N}]+/u;

const stripLead = (line: string) => line.replace(LEADING_SYMBOLS, "").trim();

/** True when every cased letter is upper case — the seller shouting a heading. */
function isAllCaps(text: string): boolean {
  const letters = [...text].filter((c) => /\p{L}/u.test(c));
  if (letters.length < 3) return false;
  return letters.every((c) => c === c.toLocaleUpperCase("vi") && c !== c.toLocaleLowerCase("vi"));
}

/**
 * Title Case across the line — "Thiết Kế Hoàn Hảo", "Lợi Ích Tuyệt Vời". Vietnamese prose
 * capitalises only the first word, so a seller who capitalises most of them is writing a heading.
 */
function isTitleCase(text: string): boolean {
  if (text.includes(":")) return false; // "Kích thước: 35x100cm" is a fact, not a heading
  const words = text.split(/[\s–—-]+/).filter((w) => [...w].some((c) => /\p{L}/u.test(c)));
  if (words.length < 2) return false;
  const capitalised = words.filter((w) => {
    const first = [...w].find((c) => /\p{L}/u.test(c));
    return first !== undefined && first === first.toLocaleUpperCase("vi");
  });
  return capitalised.length / words.length >= 0.7;
}

/**
 * A line that opens a section. Three ways sellers write one, all present in OVIAN's catalogue:
 * "Thông số cơ bản:", "✨ ĐẶC ĐIỂM NỔI BẬT", and "💤 Thiết Kế Hoàn Hảo".
 */
export function isSectionHeading(line: string): boolean {
  const core = stripLead(line);
  if (core.length < 3 || core.length > 70) return false;
  if (core.endsWith(":")) return true;
  return isAllCaps(core) || isTitleCase(core);
}

/**
 * The weaker shape, used only when a description has no real headings at all: a short
 * emoji-led noun phrase like "🌳 Chất liệu" or "📏 Kích thước" with the detail underneath.
 *
 * These are only promoted to headings as a fallback. In a description that already has proper
 * headings the same shape is a lead-in inside a section — promoting it there would flatten
 * eight named sections into thirty unnamed ones.
 */
function isFallbackHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!LEADING_SYMBOLS.test(trimmed)) return false;
  const core = stripLead(trimmed);
  if (core.length < 3 || core.length > 40) return false;
  if (core.includes(":") || /[.!?,;]$/.test(core)) return false;
  return core.split(/\s+/).length <= 5;
}

/**
 * A line the seller wrote as a lead-in rather than a fact: an emoji followed by a short phrase
 * with no "key: value" and no full stop. "🚶 Cảm biến chuyển động thông minh" is one;
 * "📏 Chiều cao tổng thể: 450mm" is not, and neither is a finished sentence.
 */
function isLabel(line: string): boolean {
  const trimmed = line.trim();
  if (!LEADING_SYMBOLS.test(trimmed)) return false;
  const core = stripLead(trimmed);
  if (core.length < 3 || core.length > 110) return false;
  return !core.includes(":") && !/[.!?]$/.test(core);
}

const toLine = (text: string): DescriptionLine => ({ kind: isLabel(text) ? "label" : "text", text: text.trim() });

/** Heading text without the emoji and the trailing colon, for use as a section title. */
const titleOf = (line: string) => stripLead(line).replace(/:+$/, "").trim();

export function parseDescription(raw: string | null | undefined): ParsedDescription {
  const lines = (raw ?? "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  const intro: DescriptionLine[] = [];
  const sections: DescriptionSection[] = [];

  // Use the strongest structure the seller actually used. Only a description with no real
  // headings falls back to treating its emoji lead-ins as the structure.
  const useFallback = lines.filter(isSectionHeading).length < 2;
  const opensSection = (l: string) => isSectionHeading(l) || (useFallback && isFallbackHeading(l));

  for (const line of lines) {
    if (opensSection(line)) {
      sections.push({ title: titleOf(line), lines: [] });
      continue;
    }
    const parsed = toLine(line);
    if (sections.length) sections[sections.length - 1]!.lines.push(parsed);
    else intro.push(parsed);
  }

  // A heading with nothing under it would render as an empty drawer — but dropping it would
  // delete words the seller wrote. "📜 Thông Tin Chi Tiết" followed straight by "📍 Chất liệu:"
  // is a parent heading, so it becomes a bold lead-in on the section that follows instead.
  const kept: DescriptionSection[] = [];
  let orphans: DescriptionLine[] = [];
  for (const section of sections) {
    if (!section.lines.length) {
      orphans.push({ kind: "label", text: section.title });
      continue;
    }
    section.lines.unshift(...orphans);
    orphans = [];
    kept.push(section);
  }
  // Headings at the very end with nothing after them keep their place in document order.
  if (orphans.length) (kept.at(-1)?.lines ?? intro).push(...orphans);

  return { intro, sections: kept };
}
