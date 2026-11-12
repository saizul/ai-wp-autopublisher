const REQUIRED = ["OPENAI_API_KEY", "WP_URL", "WP_USERNAME", "WP_APP_PASSWORD"];
export const POST_STATUSES = ["publish", "draft", "pending", "private"];

/**
 * Validate environment variables and return a normalised config.
 * Throws one Error listing every problem. OpenAI/WordPress credentials are
 * not required in dry-run mode because nothing is generated or published.
 */
export function loadConfig(env = process.env, { dryRun = false } = {}) {
  const problems = [];

  if (!dryRun) {
    for (const key of REQUIRED) {
      if (!env[key] || !String(env[key]).trim()) problems.push(`${key} is missing`);
    }
  }

  let wpUrl = (env.WP_URL || "").trim().replace(/\/+$/, "");
  if (wpUrl && !/^https?:\/\/[^\s/]+/i.test(wpUrl)) {
    problems.push("WP_URL must start with http:// or https://");
  }

  const rawCount = env.POSTS_PER_RUN;
  let postsPerRun = 1;
  if (rawCount !== undefined && String(rawCount).trim() !== "") {
    postsPerRun = Number(rawCount);
    if (!Number.isInteger(postsPerRun) || postsPerRun < 1) {
      problems.push(`POSTS_PER_RUN must be a positive integer (got "${rawCount}")`);
    }
  }

  const postStatus = (env.WP_POST_STATUS || "publish").trim().toLowerCase();
  if (!POST_STATUSES.includes(postStatus)) {
    problems.push(`WP_POST_STATUS must be one of ${POST_STATUSES.join(", ")} (got "${env.WP_POST_STATUS}")`);
  }

  const stateFile = (env.STATE_FILE || ".autopublish-state.json").trim();
  if (!stateFile) problems.push("STATE_FILE must not be empty");

  if (problems.length) {
    throw new Error(
      `Invalid configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}\n` +
        "See the Configuration section of the README."
    );
  }

  return {
    openaiApiKey: env.OPENAI_API_KEY,
    wpUrl,
    wpUsername: env.WP_USERNAME,
    wpAppPassword: env.WP_APP_PASSWORD,
    postsPerRun,
    postStatus,
    stateFile,
  };
}

/** Parse CLI flags (everything after `node script`). */
export function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

/** Pick the next `count` non-empty keywords. */
export function selectKeywords(keywords, count) {
  return keywords.map((k) => (k || "").trim()).filter(Boolean).slice(0, count);
}
