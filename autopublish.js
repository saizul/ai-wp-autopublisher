import dotenv from "dotenv";
import fs from "fs";
import csv from "csv-parser";
import { loadConfig, parseArgs, selectKeywords } from "./config.js";

dotenv.config();

const KEYWORDS_FILE = fs.existsSync("Keywords.csv") ? "Keywords.csv" : "keywords.csv";
const { dryRun } = parseArgs(process.argv.slice(2));

let config;
try {
  config = loadConfig(process.env, { dryRun });
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const keywords = [];

fs.createReadStream(KEYWORDS_FILE)
  // The sample CSV uses a "Keyword" header; accept any casing.
  .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
  .on("data", (row) => keywords.push(row.keyword))
  .on("error", (err) => {
    console.error(`Could not read ${KEYWORDS_FILE}: ${err.message}`);
    process.exit(1);
  })
  .on("end", async () => {
    const batch = selectKeywords(keywords, config.postsPerRun);
    if (!batch.length) {
      console.error(`No keywords found in ${KEYWORDS_FILE}.`);
      process.exit(1);
    }

    if (dryRun) {
      console.log(`[dry-run] Would generate and publish ${batch.length} post(s) to ${config.wpUrl || "(WP_URL unset)"}:`);
      batch.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));
      return;
    }

    const { generateArticle } = await import("./generateArticle.js");
    const { publishPost } = await import("./publishToWP.js");
    for (const keyword of batch) {
      const content = await generateArticle(keyword);
      await publishPost(keyword, content);
      console.log("Published:", keyword);
    }
  });
