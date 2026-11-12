import { marked } from "marked";

/**
 * The model answers in Markdown. WordPress expects HTML, so convert it and use the
 * first H1 (if any) as the post title instead of the raw keyword.
 *
 * Returns { title, html }. `title` falls back to `fallbackTitle`.
 */
export function articleToPost(markdown, fallbackTitle) {
  let text = String(markdown || "").replace(/\r\n/g, "\n").trim();

  // Some replies wrap the whole article in a ```markdown fence.
  const fenced = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  if (fenced) text = fenced[1].trim();

  let title = "";
  const h1 = text.match(/^#\s+(.+?)\s*#*\s*$/m);
  if (h1 && text.slice(0, h1.index).trim() === "") {
    title = h1[1].replace(/[*_`]/g, "").trim();
    text = text.slice(h1.index + h1[0].length).trim();
  }

  if (!text) throw new Error("article is empty after removing the title");
  const html = marked.parse(text, { gfm: true, async: false }).trim();
  return { title: title || titleCase(fallbackTitle), html };
}

/** "one page website" -> "One Page Website" (keeps words that are already mixed case). */
export function titleCase(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .map((w) => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
