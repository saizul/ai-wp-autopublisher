

import dotenv from "dotenv";
dotenv.config();


import fs from "fs";
import csv from "csv-parser";
import { generateArticle } from "./generateArticle.js";
import { publishPost } from "./publishToWP.js";

const keywords = [];

fs.createReadStream("keywords.csv")
  .pipe(csv())
  .on("data", (row) => keywords.push(row.keyword))
  .on("end", async () => {
    for (let i = 0; i < process.env.POSTS_PER_RUN; i++) {
      const keyword = keywords.shift();
      const content = await generateArticle(keyword);
      await publishPost(keyword, content);
      console.log("Published:", keyword);
    }
  });
