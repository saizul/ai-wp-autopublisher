import fs from "fs";
import path from "path";

export const DEFAULT_STATE_FILE = ".autopublish-state.json";
const STATE_VERSION = 1;

/** Normalise a keyword so "One Page Website " and "one page website" match. */
export function keywordKey(keyword) {
  return String(keyword || "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** WordPress-style slug from a keyword ("1 Page Website!" -> "1-page-website"). */
export function slugify(text) {
  const slug = String(text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 190)
    .replace(/-+$/g, "");
  return slug || "post";
}

/**
 * Remembers which keywords were already published so each run picks new ones.
 * The file is small JSON, written atomically (temp file + rename) after every
 * successful post, so an interrupted run never loses or corrupts progress.
 */
export class PublishState {
  constructor(file = DEFAULT_STATE_FILE, entries = {}) {
    this.file = file;
    this.entries = entries;
  }

  static load(file = DEFAULT_STATE_FILE) {
    if (!fs.existsSync(file)) return new PublishState(file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
      throw new Error(`State file ${file} is not valid JSON (${err.message}). Fix or delete it.`);
    }
    if (!data || typeof data !== "object" || data.version !== STATE_VERSION || typeof data.published !== "object") {
      throw new Error(`State file ${file} has an unknown format. Fix or delete it.`);
    }
    return new PublishState(file, data.published || {});
  }

  has(keyword) {
    return Object.prototype.hasOwnProperty.call(this.entries, keywordKey(keyword));
  }

  get size() {
    return Object.keys(this.entries).length;
  }

  record(keyword, { id, link, slug, status, skipped = false } = {}) {
    this.entries[keywordKey(keyword)] = {
      keyword: String(keyword).trim(),
      id: id ?? null,
      link: link ?? null,
      slug: slug ?? null,
      status: status ?? null,
      skipped,
      at: new Date().toISOString(),
    };
  }

  save() {
    const dir = path.dirname(path.resolve(this.file));
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    const payload = { version: STATE_VERSION, published: this.entries };
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf8");
    fs.renameSync(tmp, this.file);
  }
}
