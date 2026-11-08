import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig, parseArgs, selectKeywords } from "../config.js";

const good = {
  OPENAI_API_KEY: "k",
  WP_URL: "https://example.com/",
  WP_USERNAME: "u",
  WP_APP_PASSWORD: "p",
  POSTS_PER_RUN: "3",
};

test("valid env is normalised", () => {
  const c = loadConfig(good);
  assert.equal(c.wpUrl, "https://example.com");
  assert.equal(c.postsPerRun, 3);
});

test("POSTS_PER_RUN defaults to 1", () => {
  const { POSTS_PER_RUN, ...rest } = good;
  assert.equal(loadConfig(rest).postsPerRun, 1);
});

test("reports all missing variables at once", () => {
  assert.throws(() => loadConfig({}), (e) =>
    ["OPENAI_API_KEY", "WP_URL", "WP_USERNAME", "WP_APP_PASSWORD"].every((k) => e.message.includes(k))
  );
});

test("rejects bad POSTS_PER_RUN and WP_URL", () => {
  assert.throws(() => loadConfig({ ...good, POSTS_PER_RUN: "abc" }), /POSTS_PER_RUN/);
  assert.throws(() => loadConfig({ ...good, POSTS_PER_RUN: "0" }), /POSTS_PER_RUN/);
  assert.throws(() => loadConfig({ ...good, WP_URL: "example.com" }), /WP_URL must start/);
});

test("dry-run does not require credentials", () => {
  assert.equal(loadConfig({}, { dryRun: true }).postsPerRun, 1);
});

test("parseArgs and selectKeywords", () => {
  assert.equal(parseArgs(["--dry-run"]).dryRun, true);
  assert.equal(parseArgs([]).dryRun, false);
  assert.deepEqual(selectKeywords(["a", " ", undefined, " b ", "c"], 2), ["a", "b"]);
});
