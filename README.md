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
| `WP_POST_STATUS` | no | `publish` (default), `draft`, `pending` or `private` |
| `OPENAI_MODEL` | no | Model name (default `gpt-4.1-mini`) |
| `STATE_FILE` | no | Where published keywords are remembered (default `.autopublish-state.json`) |

Keywords are read from the `keyword` column of `Keywords.csv` (header casing is ignored).

## How a run works

1. Keywords are read in CSV order. Blank rows and repeats (case and spacing ignored) are dropped.
2. Keywords already listed in the state file are skipped, so each run (for example from cron) takes the **next** `POSTS_PER_RUN` keywords instead of the same ones again.
3. Before generating, the site is asked whether a post with the keyword's slug already exists (any status). If it does, the keyword is recorded and skipped, so nothing is published twice even if the state file was lost.
4. The Markdown article is converted to HTML. Its first `# Heading` becomes the post title (otherwise the keyword in title case) and the slug is derived from the keyword.
5. After every successful post the state file is saved atomically. One failing keyword (rate limit, timeout) is reported and the batch continues; the run exits with code 1 if anything failed.

WordPress requests are retried with backoff on timeouts, `429` and `5xx`. The state file is gitignored; delete an entry from it to publish that keyword again.

## Dry run
Preview which keywords would be used next, with their slugs and the post status, without calling OpenAI or WordPress (credentials not required):
```bash
npm run dry-run
```

## Tests
```bash
npm test
```

Tests run offline (fake OpenAI and WordPress clients) and also run in GitHub Actions on Node 20, 22 and 24. Requires Node 20+.

**Author:** [Saizul Amin](https://saizul.com)
