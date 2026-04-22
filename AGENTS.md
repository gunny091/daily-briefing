# AGENTS.md

## Project Summary

- This repo is a TypeScript one-shot app that builds a daily briefing and sends it to a Discord webhook.
- Entry point is `src/index.ts`.
- Runtime flow is:
  1. Load and validate `config.yml`
  2. Compute today's date in KST
  3. Fetch or create the daily Notion page
  4. Build D-day items
  5. Fetch weather from Open-Meteo
  6. Fetch upcoming schedules from Notion
  7. Fetch quote of the day
  8. Format one message and send it to Discord

## Structure

- `src/`
  Main source files.
- `src/index.ts`
  App entry point. Orchestrates all async tasks and sends the final message.
- `src/config.ts`
  Loads and validates `config.yml`.
- `src/time.ts`
  KST-based date/time helpers.
- `src/dday.ts`
  D-day calculation logic.
- `src/weather.ts`
  Open-Meteo client and weather summary mapping.
- `src/notion.ts`
  Notion API integration for daily page + schedules.
- `src/quote.ts`
  Quote API integration.
- `src/discord.ts`
  Discord webhook sender.
- `src/formatter.ts`
  Converts fetched data into the final briefing text.
- `src/types.ts`
  Shared app types.
- `src/*.test.ts`
  Vitest test files for each module.

- `dist/`
  Compiled JavaScript output from TypeScript build. Treat this as generated code.
- `config.yml.example`
  Example config template.
- `config.yml`
  Local runtime config file used by the app.
- `README.md`
  Setup, config, and behavior overview.
- `Dockerfile`, `docker-compose.yml`
  Containerized one-shot execution setup.

## Working Notes

- Edit files in `src/` first. `dist/` should come from `npm run build`.
- Main user-facing output shape is controlled in `src/formatter.ts`.
- External integrations are isolated by file, so API-related changes usually stay inside one module.
- Tests run with `npm test`.
