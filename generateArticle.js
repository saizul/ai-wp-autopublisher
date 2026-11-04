

import dotenv from "dotenv";
dotenv.config();


import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateArticle(keyword) {
  const prompt = `
Write a human-like, SEO-optimized article.

Keyword: "${keyword}"

Rules:
- 1500+ words
- Unique intro
- Use H2 & H3
- Add FAQ section
- Natural UK English
- No AI mention
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content;
}
