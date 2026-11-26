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

/** A line that opens a section: "Thông số cơ bản:" or "✨ ĐẶC ĐIỂM NỔI BẬT". */
export function isSectionHeading(line: string): boolean {
  const core = stripLead(line);
  if (core.length < 3 || core.length > 70) return false;
  if (core.endsWith(":")) return true;
  return isAllCaps(core);
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

  for (const line of lines) {
    if (isSectionHeading(line)) {
      sections.push({ title: titleOf(line), lines: [] });
      continue;
    }
    const parsed = toLine(line);
    if (sections.length) sections[sections.length - 1]!.lines.push(parsed);
    else intro.push(parsed);
  }

  // Headings with nothing under them would render as empty drawers.
  return { intro, sections: sections.filter((s) => s.lines.length > 0) };
}
