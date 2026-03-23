import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { AppConfig } from "./types";

function ensureNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid config field: ${fieldName}`);
  }
  return value.trim();
}

function ensureNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid config field: ${fieldName}`);
  }
  return value;
}

function ensureDateString(value: unknown, fieldName: string): string {
  const date = ensureNonEmptyString(value, fieldName);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid config field: ${fieldName}`);
  }
  return date;
}

export function loadConfig(configPath = path.resolve(process.cwd(), "config.yml")): AppConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config file: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = yaml.load(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Config file must contain a YAML object");
  }

  const data = parsed as Record<string, unknown>;
  const discord = data.discord as Record<string, unknown> | undefined;
  const weather = data.weather as Record<string, unknown> | undefined;
  const notion = data.notion as Record<string, unknown> | undefined;
  const ddays = data.ddays;

  if (!discord || !weather || !notion || !Array.isArray(ddays)) {
    throw new Error("Config file is missing required top-level sections");
  }

  return {
    discord: {
      webhookUrl: ensureNonEmptyString(discord.webhookUrl, "discord.webhookUrl")
    },
    weather: {
      latitude: ensureNumber(weather.latitude, "weather.latitude"),
      longitude: ensureNumber(weather.longitude, "weather.longitude")
    },
    notion: {
      token: ensureNonEmptyString(notion.token, "notion.token"),
      schedule: {
        databaseId: ensureNonEmptyString((notion.schedule as Record<string, unknown> | undefined)?.databaseId, "notion.schedule.databaseId"),
        dateProperty: ensureNonEmptyString((notion.schedule as Record<string, unknown> | undefined)?.dateProperty, "notion.schedule.dateProperty")
      },
      daily: {
        databaseId: ensureNonEmptyString((notion.daily as Record<string, unknown> | undefined)?.databaseId, "notion.daily.databaseId"),
        dateProperty: ensureNonEmptyString((notion.daily as Record<string, unknown> | undefined)?.dateProperty, "notion.daily.dateProperty")
      }
    },
    ddays: ddays.map((item, index) => {
      const row = item as Record<string, unknown>;
      return {
        name: ensureNonEmptyString(row?.name, `ddays[${index}].name`),
        date: ensureDateString(row?.date, `ddays[${index}].date`)
      };
    })
  };
}
