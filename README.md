# AI WordPress Auto-Publisher

Node.js script that reads keywords from `Keywords.csv`, generates SEO articles with the OpenAI API and publishes them to WordPress through the REST API (Application Passwords).

## Setup
```bash
npm install
cp .env.example .env   # or create .env by hand, see below
npm start
```

## Configuration
Set these in `.env`. The script validates them on start and prints every problem at once.

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | OpenAI API key |
| `WP_URL` | yes | Site URL, e.g. `https://example.com` (no trailing path) |
| `WP_USERNAME` | yes | WordPress user |
| `WP_APP_PASSWORD` | yes | Application Password for that user |
| `POSTS_PER_RUN` | no | Number of keywords to publish per run (default `1`) |

Keywords are read from the `keyword` column of `Keywords.csv` (header casing is ignored).

## Dry run
Preview which keywords would be used without calling OpenAI or WordPress (credentials not required):
```bash
npm run dry-run
```

## Tests
```bash
npm test
```

**Author:** [Saizul Amin](https://saizul.com)
