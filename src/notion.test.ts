import { describe, expect, it } from "vitest";
import { ensureTodayPage, fetchUpcomingSchedules } from "./notion";

describe("fetchUpcomingSchedules", () => {
  it("includes entries using end date when present and start date when end is missing", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              url: "https://www.notion.so/trip",
              properties: {
                제목: { type: "title", title: [{ plain_text: "출장" }] },
                일정: { type: "date", date: { start: "2026-03-20T09:00:00.000Z", end: "2026-03-23T09:00:00.000Z" } }
              }
            },
            {
              url: "https://www.notion.so/meeting",
              properties: {
                Name: { type: "title", title: [{ plain_text: "회의" }] },
                일정: { type: "date", date: { start: "2026-03-24T01:00:00.000Z", end: null } }
              }
            },
            {
              properties: {
                Name: { type: "title", title: [{ plain_text: "제외" }] },
                일정: { type: "date", date: { start: "2026-03-22T01:00:00.000Z", end: null } }
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    try {
      const items = await fetchUpcomingSchedules("token", "db", "일정", "2026-03-22");
      expect(items).toHaveLength(2);
      expect(items.map((item) => item.title)).toEqual(["출장", "회의"]);
      expect(items.map((item) => item.url)).toEqual(["https://www.notion.so/trip", "https://www.notion.so/meeting"]);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("falls back to untitled when title property is missing", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              properties: {
                일정: { type: "date", date: { start: "2026-03-24T01:00:00.000Z", end: null } }
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    try {
      const items = await fetchUpcomingSchedules("token", "db", "일정", "2026-03-22");
      expect(items[0]?.title).toBe("(제목 없음)");
      expect(items[0]?.url).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("skips entries when both start and end are missing", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              url: "https://www.notion.so/invalid",
              properties: {
                Name: { type: "title", title: [{ plain_text: "비정상 데이터" }] },
                일정: { type: "date", date: { start: null, end: null } }
              }
            },
            {
              url: "https://www.notion.so/valid",
              properties: {
                Name: { type: "title", title: [{ plain_text: "정상 일정" }] },
                일정: { type: "date", date: { start: "2026-03-24T01:00:00.000Z", end: null } }
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    try {
      const items = await fetchUpcomingSchedules("token", "db", "일정", "2026-03-22");
      expect(items).toHaveLength(1);
      expect(items[0]?.title).toBe("정상 일정");
      expect(items[0]?.url).toBe("https://www.notion.so/valid");
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("ensureTodayPage", () => {
  it("returns an existing page when today's date-only page exists", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              url: "https://www.notion.so/today",
              properties: {
                Name: { type: "title", title: [{ plain_text: "2026-03-23" }] },
                날짜: { type: "date", date: { start: "2026-03-23", end: null } }
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    try {
      const page = await ensureTodayPage("token", "db", "날짜", "2026-03-23");
      expect(page).toEqual({ title: "2026-03-23", url: "https://www.notion.so/today" });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("creates a page when today's pages only have time values", async () => {
    const originalFetch = global.fetch;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push({ url, init });

      if (url.endsWith("/query")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                url: "https://www.notion.so/with-time",
                properties: {
                  Name: { type: "title", title: [{ plain_text: "시간 있음" }] },
                  날짜: { type: "date", date: { start: "2026-03-23T00:00:00.000Z", end: null } }
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/v1/databases/")) {
        return new Response(
          JSON.stringify({
            properties: {
              제목: { type: "title" },
              날짜: { type: "date" }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.endsWith("/v1/pages")) {
        return new Response(
          JSON.stringify({
            url: "https://www.notion.so/new-page"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    };

    try {
      const page = await ensureTodayPage("token", "db", "날짜", "2026-03-23");
      expect(page).toEqual({ title: "2026-03-23", url: "https://www.notion.so/new-page" });

      const createCall = calls.find((call) => call.url.endsWith("/v1/pages"));
      expect(createCall).toBeDefined();
      expect(JSON.parse(String(createCall?.init?.body))).toEqual({
        parent: {
          database_id: "db"
        },
        properties: {
          제목: {
            title: [
              {
                text: {
                  content: "2026-03-23"
                }
              }
            ]
          },
          날짜: {
            date: {
              start: "2026-03-23"
            }
          }
        }
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("creates a page when no matching page exists", async () => {
    const originalFetch = global.fetch;
    global.fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith("/query")) {
        return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      if (url.includes("/v1/databases/")) {
        return new Response(
          JSON.stringify({
            properties: {
              Name: { type: "title" },
              날짜: { type: "date" }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.endsWith("/v1/pages")) {
        return new Response(
          JSON.stringify({
            url: "https://www.notion.so/created"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    };

    try {
      const page = await ensureTodayPage("token", "db", "날짜", "2026-03-23");
      expect(page).toEqual({ title: "2026-03-23", url: "https://www.notion.so/created" });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("fails when the database has no title property", async () => {
    const originalFetch = global.fetch;
    global.fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith("/query")) {
        return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      if (url.includes("/v1/databases/")) {
        return new Response(
          JSON.stringify({
            properties: {
              날짜: { type: "date" }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    };

    try {
      await expect(ensureTodayPage("token", "db", "날짜", "2026-03-23")).rejects.toThrow(/title property/);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("fails when the notion request fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => new Response("bad", { status: 500 });

    try {
      await expect(ensureTodayPage("token", "db", "날짜", "2026-03-23")).rejects.toThrow(/status 500/);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
