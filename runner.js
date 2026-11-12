import { articleToPost } from "./markdown.js";
import { keywordKey, slugify } from "./state.js";

/**
 * Pick up to `count` keywords that are not in `state` yet (first occurrence wins,
 * case and spacing ignored).
 */
export function pendingKeywords(keywords, state, count) {
  const seen = new Set();
  const out = [];
  for (const raw of keywords) {
    const keyword = String(raw || "").trim();
    const key = keywordKey(keyword);
    if (!key || seen.has(key) || state.has(keyword)) continue;
    seen.add(key);
    out.push(keyword);
    if (out.length >= count) break;
  }
  return out;
}

/**
 * Generate and publish each keyword. One failure does not stop the batch.
 * A keyword whose slug already exists on the site is recorded and skipped, so the
 * same article is never published twice even if the state file was lost.
 *
 * Returns { published, skipped, failed } arrays.
 */
export async function runBatch(batch, { generate, wp, state, status = "publish", log = console.log }) {
  const result = { published: [], skipped: [], failed: [] };
  for (const keyword of batch) {
    const slug = slugify(keyword);
    try {
      const existing = await wp.findPostBySlug(slug);
      if (existing) {
        state.record(keyword, { ...existing, slug, skipped: true });
        state.save();
        result.skipped.push(keyword);
        log(`SKIP  ${keyword} (slug "${slug}" already exists: id ${existing.id})`);
        continue;
      }
      const markdown = await generate(keyword);
      const { title, html } = articleToPost(markdown, keyword);
      const post = await wp.createPost({ title, content: html, slug, status });
      state.record(keyword, { ...post, slug });
      state.save();
      result.published.push(keyword);
      log(`OK    ${keyword} -> id ${post.id} (${post.status}) ${post.link || ""}`.trimEnd());
    } catch (err) {
      result.failed.push({ keyword, error: err.message });
      log(`FAIL  ${keyword}: ${err.message}`);
    }
  }
  return result;
}
