import axios from "axios";

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Small WordPress REST client (Application Passwords).
 * `http` is injectable for tests and must look like axios ({ request }).
 */
export function createWpClient(config, { http = axios, retries = 2, retryDelayMs = 1000 } = {}) {
  const auth = Buffer.from(`${config.wpUsername}:${config.wpAppPassword}`).toString("base64");
  const base = `${config.wpUrl}/wp-json/wp/v2`;

  async function request(method, path, { params, data } = {}) {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await http.request({
          method,
          url: base + path,
          params,
          data,
          timeout: 30000,
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        });
        return res.data;
      } catch (err) {
        const status = err.response?.status;
        const retryable = status === undefined ? Boolean(err.code) : RETRYABLE.has(status);
        if (retryable && attempt < retries) {
          await sleep(retryDelayMs * 2 ** attempt);
          continue;
        }
        const detail = err.response?.data?.message || err.message;
        throw new Error(`WordPress ${method} ${path} failed${status ? ` (${status})` : ""}: ${detail}`);
      }
    }
  }

  return {
    /** Existing post with this slug in any status, or null. */
    async findPostBySlug(slug) {
      const data = await request("GET", "/posts", {
        params: { slug, status: "any", _fields: "id,link,status" },
      });
      return Array.isArray(data) && data.length ? data[0] : null;
    },

    async createPost({ title, content, slug, status }) {
      const data = await request("POST", "/posts", { data: { title, content, slug, status } });
      if (!data || data.id === undefined) throw new Error("WordPress did not return a post id");
      return { id: data.id, link: data.link, status: data.status ?? status };
    },
  };
}

/** Backwards compatible helper: publish one post using process.env credentials. */
export async function publishPost(title, content) {
  const client = createWpClient({
    wpUrl: String(process.env.WP_URL || "").replace(/\/+$/, ""),
    wpUsername: process.env.WP_USERNAME,
    wpAppPassword: process.env.WP_APP_PASSWORD,
  });
  const post = await client.createPost({ title, content, status: "publish" });
  console.log("Post published. ID:", post.id);
  return post;
}
