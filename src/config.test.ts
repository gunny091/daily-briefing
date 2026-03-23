import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config";

const tempDirs: string[] = [];

function writeTempConfig(contents: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-briefing-config-"));
  tempDirs.push(dir);
  const configPath = path.join(dir, "config.yml");
  fs.writeFileSync(configPath, contents, "utf8");
  return configPath;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("loadConfig", () => {
  it("loads a valid config", () => {
    const configPath = writeTempConfig(`
discord:
  webhookUrl: "https://discord.test/webhook"
weather:
  latitude: 37.5665
  longitude: 126.9780
notion:
  token: "secret"
  schedule:
    databaseId: "db"
    dateProperty: "일정"
  daily:
    databaseId: "daily-db"
    dateProperty: "날짜"
ddays:
  - name: "test"
    date: "2026-03-30"
`);

    const config = loadConfig(configPath);
    expect(config.discord.webhookUrl).toBe("https://discord.test/webhook");
    expect(config.notion.daily.databaseId).toBe("daily-db");
    expect(config.notion.schedule.databaseId).toBe("db");
    expect(config.ddays).toHaveLength(1);
  });

  it("rejects missing required field", () => {
    const configPath = writeTempConfig(`
discord:
  webhookUrl: ""
weather:
  latitude: 37.5665
  longitude: 126.9780
notion:
  token: "secret"
  schedule:
    databaseId: "db"
    dateProperty: "일정"
  daily:
    databaseId: "daily-db"
    dateProperty: "날짜"
ddays: []
`);

    expect(() => loadConfig(configPath)).toThrow(/discord\.webhookUrl/);
  });

  it("rejects invalid date format", () => {
    const configPath = writeTempConfig(`
discord:
  webhookUrl: "https://discord.test/webhook"
weather:
  latitude: 37.5665
  longitude: 126.9780
notion:
  token: "secret"
  schedule:
    databaseId: "db"
    dateProperty: "일정"
  daily:
    databaseId: "daily-db"
    dateProperty: "날짜"
ddays:
  - name: "test"
    date: "03-30-2026"
`);

    expect(() => loadConfig(configPath)).toThrow(/ddays\[0\]\.date/);
  });

  it("rejects missing daily config", () => {
    const configPath = writeTempConfig(`
discord:
  webhookUrl: "https://discord.test/webhook"
weather:
  latitude: 37.5665
  longitude: 126.9780
notion:
  token: "secret"
  schedule:
    databaseId: "db"
    dateProperty: "일정"
ddays: []
`);

    expect(() => loadConfig(configPath)).toThrow(/notion\.daily\.databaseId/);
  });
});
