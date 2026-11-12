import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { PublishState, keywordKey, slugify } from "../state.js";
import { articleToPost, titleCase } from "../markdown.js";
import { pendingKeywords, runBatch } from "../runner.js";
import { createWpClient } from "../publishToWP.js";
import { loadConfig } from "../config.js";

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "awp-")), "nested", "state.json");
const quiet = () => {};

test("slugify and keywordKey", () => {
  assert.equal(slugify("1 Page Website!"), "1-page-website");
  assert.equal(slugify("Café  Menü"), "cafe-menu");
  assert.equal(slugify("!!!"), "post");
  assert.ok(slugify("a ".repeat(200)).length <= 190);
  assert.equal(keywordKey("  One   Page "), "one page");
});

test("state persists atomically and reloads", () => {
  const file = tmpFile();
  const s = PublishState.load(file);
  assert.equal(s.size, 0);
  s.record("One Page", { id: 4, link: "https://e.com/one-page", slug: "one-page", status: "publish" });
  s.save();
  const again = PublishState.load(file);
  assert.ok(again.has("one  page"));
  assert.equal(again.entries["one page"].id, 4);
  assert.deepEqual(fs.readdirSync(path.dirname(file)), ["state.json"]);
});

test("state rejects corrupt or foreign files", () => {
  const file = tmpFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "{not json");
  assert.throws(() => PublishState.load(file), /not valid JSON/);
  fs.writeFileSync(file, JSON.stringify({ version: 99, published: {} }));
  assert.throws(() => PublishState.load(file), /unknown format/);
});

test("pendingKeywords skips done, blank and duplicate keywords", () => {
  const s = new PublishState("unused", {});
  s.record("one page");
  const out = pendingKeywords(["One Page", "", " two ", "TWO", "three", "four"], s, 2);
  assert.deepEqual(out, ["two", "three"]);
});

test("articleToPost converts Markdown and lifts the H1", () => {
  const { title, html } = articleToPost("# Best **One** Page Sites\n\nIntro\n\n## Why\n\n- a\n- b", "x");
  assert.equal(title, "Best One Page Sites");
  assert.ok(html.startsWith("<p>Intro</p>"));
  assert.match(html, /<h2>Why<\/h2>/);
  assert.match(html, /<li>a<\/li>/);
  assert.doesNotMatch(html, /<h1>/);
});

test("articleToPost handles fences, missing H1 and empty bodies", () => {
  const fenced = articleToPost("```markdown\n# T\n\nBody\n```", "kw");
  assert.equal(fenced.title, "T");
  assert.equal(fenced.html, "<p>Body</p>");
  const noTitle = articleToPost("Text first\n\n# Late heading", "one page website");
  assert.equal(noTitle.title, "One Page Website");
  assert.match(noTitle.html, /<h1>Late heading<\/h1>/);
  assert.throws(() => articleToPost("# Only a title", "kw"), /empty/);
  assert.equal(titleCase("seo for iPhone apps"), "Seo For iPhone Apps");
});

function fakeWp(existing = {}) {
  const created = [];
  return {
    created,
    async findPostBySlug(slug) {
      return existing[slug] || null;
    },
    async createPost(post) {
      created.push(post);
      return { id: 100 + created.length, link: `https://e.com/${post.slug}/`, status: post.status };
    },
  };
}

test("runBatch publishes, skips existing slugs and survives failures", async () => {
  const file = tmpFile();
  const state = PublishState.load(file);
  const wp = fakeWp({ "already-there": { id: 9, link: "https://e.com/already-there/", status: "draft" } });
  const generate = async (k) => {
    if (k === "broken") throw new Error("rate limited");
    return `# ${titleCase(k)} Guide\n\nBody for ${k}`;
  };
  const result = await runBatch(["good one", "already there", "broken"], {
    generate,
    wp,
    state,
    status: "draft",
    log: quiet,
  });
  assert.deepEqual(result.published, ["good one"]);
  assert.deepEqual(result.skipped, ["already there"]);
  assert.deepEqual(result.failed, [{ keyword: "broken", error: "rate limited" }]);
  assert.deepEqual(wp.created[0], {
    title: "Good One Guide",
    content: "<p>Body for good one</p>",
    slug: "good-one",
    status: "draft",
  });
  const saved = PublishState.load(file);
  assert.ok(saved.has("good one") && saved.has("already there") && !saved.has("broken"));
  assert.equal(saved.entries["already there"].skipped, true);
});

test("WordPress client retries 429 and reports clear errors", async () => {
  const calls = [];
  const responses = [
    { error: { response: { status: 429, data: {} } } },
    { data: [] },
    { error: { response: { status: 401, data: { message: "Sorry, you are not allowed" } } } },
  ];
  const http = {
    async request(cfg) {
      calls.push(cfg);
      const next = responses.shift();
      if (next.error) throw Object.assign(new Error("http"), next.error);
      return { data: next.data };
    },
  };
  const wp = createWpClient(
    { wpUrl: "https://e.com", wpUsername: "u", wpAppPassword: "p" },
    { http, retryDelayMs: 1 }
  );
  assert.equal(await wp.findPostBySlug("x"), null);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "https://e.com/wp-json/wp/v2/posts");
  assert.deepEqual(calls[1].params, { slug: "x", status: "any", _fields: "id,link,status" });
  assert.match(calls[1].headers.Authorization, /^Basic /);
  await assert.rejects(wp.createPost({ title: "t", content: "c", slug: "t", status: "draft" }), /\(401\): Sorry/);
  assert.equal(calls.length, 3, "4xx other than 429 is not retried");
});

test("config validates WP_POST_STATUS and STATE_FILE", () => {
  const base = { OPENAI_API_KEY: "k", WP_URL: "https://e.com", WP_USERNAME: "u", WP_APP_PASSWORD: "p" };
  assert.equal(loadConfig(base).postStatus, "publish");
  assert.equal(loadConfig({ ...base, WP_POST_STATUS: "Draft" }).postStatus, "draft");
  assert.throws(() => loadConfig({ ...base, WP_POST_STATUS: "future" }), /WP_POST_STATUS/);
  assert.equal(loadConfig(base).stateFile, ".autopublish-state.json");
  assert.throws(() => loadConfig({ ...base, STATE_FILE: "  " }), /STATE_FILE/);
});
