

import dotenv from "dotenv";
dotenv.config();


import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateArticle(keyword) {
  const prompt = `
Write a human-like, SEO-optimized article.

Keyword: "${keyword}"

Rules:
- Return Markdown only
- Start with one H1 line ("# Title") that reads naturally and contains the keyword
- 1500+ words
- Unique intro
- Use H2 & H3
- Add FAQ section
- Natural UK English
- No AI mention
`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || !content.trim()) throw new Error("OpenAI returned an empty article");
  return content;
}
