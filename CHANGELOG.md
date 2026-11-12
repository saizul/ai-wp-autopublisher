# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- State file (`.autopublish-state.json`, configurable with `STATE_FILE`) so every run
  picks the next unpublished keywords instead of repeating the first ones.
- Duplicate protection: a keyword whose slug already exists on the site is skipped.
- Markdown to HTML conversion before publishing; the article's H1 becomes the post title.
- `WP_POST_STATUS` (publish, draft, pending, private) and `OPENAI_MODEL` settings.
- Retries with backoff for WordPress timeouts, 429 and 5xx responses.
- Per-keyword error handling with an end-of-run summary and exit code 1 on failures.
- Tests for state, Markdown conversion, batch runner and REST client; CI workflow.

### Changed
- Requires Node.js 20 or newer.

## [1.0.0]

- Environment validation, `--dry-run` and config tests.
