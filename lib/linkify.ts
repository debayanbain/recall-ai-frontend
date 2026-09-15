/**
 * Turns bare addresses inside plain body text into links.
 *
 * A memory's body is often a list of addresses and nothing else — a vision reading of a
 * screenshot ("1. Anthropic - http://anthropic.skilljar.com"), a pasted caption, an
 * extracted article footer. Those are the exact places someone wants to *go*, and text
 * they have to select and copy is a page that knows the link is there and refuses to
 * hand it over.
 *
 * Three rules, because this text is third-party content off the open web:
 *
 * 1. **Only plain web navigation is ever linked.** The pattern matches `http(s)://` and a
 *    bare `www.` and nothing else, and the result is parsed with `URL` and checked again
 *    — so `javascript:`, `data:` and every scheme-confusion trick render as the words
 *    they are. A candidate that fails stays text; it is never "fixed up".
 * 2. **The text is never rewritten.** What is displayed is the run exactly as it was
 *    written; only the `href` is normalised (a `www.` host gets `https://`). A link whose
 *    label disagrees with where it goes is the oldest trick there is.
 * 3. **Every link is `rel="noopener noreferrer nofollow"` and opens in a new tab.** The
 *    destination is chosen by whoever wrote the page we scraped, not by us.
 *
 * What this module hands back is *offsets*, not pieces of string, because the same text
 * is also segmented by the model's highlights. Cutting it here first was a real bug: the
 * stored spans on an image reading are whole lines like
 * `"1. Anthropic - http://anthropic.skilljar.com"`, so every one of them straddled a link
 * boundary, matched neither half, and the page showed "3 key lines highlighted" with
 * nothing marked. Ranges compose; slices do not.
 */

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;

/** Punctuation that ends a sentence rather than an address. */
const TRAILING = /[.,;:!?'"»”’\]}]+$/;

export type LinkRange = { start: number; end: number; href: string };

/** A link target, or null when the candidate is not plain web navigation. */
function hrefFor(candidate: string): string | null {
  const raw = candidate.toLowerCase().startsWith("www.") ? `https://${candidate}` : candidate;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function count(value: string, char: string): number {
  let total = 0;
  for (const c of value) if (c === char) total += 1;
  return total;
}

/**
 * A closing bracket only belongs to the address when the address opened one — "(see
 * http://x.com)" ends a sentence, "http://x.com/a_(b)" does not.
 */
function trimTail(found: string): string {
  let value = found;
  for (;;) {
    const stripped = value.replace(TRAILING, "");
    if (stripped !== value) {
      value = stripped;
      continue;
    }
    if (value.endsWith(")") && count(value, "(") < count(value, ")")) {
      value = value.slice(0, -1);
      continue;
    }
    return value;
  }
}

/**
 * Every address in `text`, as half-open offsets with the target to send it to.
 *
 * Non-overlapping and in reading order, so a caller can merge them with any other
 * segmentation of the same string.
 */
export function linkRanges(text: string): LinkRange[] {
  const ranges: LinkRange[] = [];

  URL_PATTERN.lastIndex = 0;
  for (let match = URL_PATTERN.exec(text); match !== null; match = URL_PATTERN.exec(text)) {
    const candidate = trimTail(match[0]);
    const href = candidate ? hrefFor(candidate) : null;
    if (!href) continue;

    const end = match.index + candidate.length;
    ranges.push({ start: match.index, end, href });
    URL_PATTERN.lastIndex = end;
  }

  return ranges;
}
