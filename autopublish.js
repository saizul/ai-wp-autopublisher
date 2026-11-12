import dotenv from "dotenv";
import fs from "fs";
import csv from "csv-parser";
import { loadConfig, parseArgs } from "./config.js";
import { PublishState, slugify } from "./state.js";
import { pendingKeywords, runBatch } from "./runner.js";

dotenv.config();

const KEYWORDS_FILE = fs.existsSync("Keywords.csv") ? "Keywords.csv" : "keywords.csv";
const { dryRun } = parseArgs(process.argv.slice(2));

function fail(message) {
  console.error(message);
  process.exit(1);
}

let config;
let state;
try {
  config = loadConfig(process.env, { dryRun });
  state = PublishState.load(config.stateFile);
} catch (err) {
  fail(err.message);
}

const keywords = [];

fs.createReadStream(KEYWORDS_FILE)
  // The sample CSV uses a "Keyword" header; accept any casing.
  .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
  .on("data", (row) => keywords.push(row.keyword))
  .on("error", (err) => fail(`Could not read ${KEYWORDS_FILE}: ${err.message}`))
  .on("end", async () => {
    const batch = pendingKeywords(keywords, state, config.postsPerRun);
    if (!batch.length) {
      fail(
        state.size
          ? `All keywords in ${KEYWORDS_FILE} are already published (see ${config.stateFile}).`
          : `No keywords found in ${KEYWORDS_FILE}.`
      );
    }

    if (dryRun) {
      console.log(
        `[dry-run] Would generate ${batch.length} post(s) as "${config.postStatus}" on ` +
          `${config.wpUrl || "(WP_URL unset)"} (${state.size} keyword(s) already done):`
      );
      batch.forEach((k, i) => console.log(`  ${i + 1}. ${k}  ->  /${slugify(k)}/`));
      return;
    }

    const { generateArticle } = await import("./generateArticle.js");
    const { createWpClient } = await import("./publishToWP.js");
    const result = await runBatch(batch, {
      generate: generateArticle,
      wp: createWpClient(config),
      state,
      status: config.postStatus,
    });
    console.log(
      `\n${result.published.length} published, ${result.skipped.length} skipped (already on site), ` +
        `${result.failed.length} failed`
    );
    if (result.failed.length) process.exitCode = 1;
  });
