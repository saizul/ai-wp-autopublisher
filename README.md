# AI WordPress Auto-Publisher

Node.js script that reads keywords from `Keywords.csv`, generates SEO articles with the OpenAI API and publishes them to WordPress through the REST API (Application Passwords).

## Setup
```bash
npm install
# create .env with: OPENAI_API_KEY, WP_URL, WP_USERNAME, WP_APP_PASSWORD, POSTS_PER_RUN
node autopublish.js
```

**Author:** [Saizul Amin](https://saizul.com)
