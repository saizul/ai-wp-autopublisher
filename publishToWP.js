

import axios from "axios";

export async function publishPost(title, content) {
  const auth = Buffer.from(
    `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
  ).toString("base64");

  const res = await axios.post(
    `${process.env.WP_URL}/wp-json/wp/v2/posts`,
    {
      title,
      content,
      status: "publish"
    },
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      }
    }
  );

  console.log("Post published. ID:", res.data.id);
}
