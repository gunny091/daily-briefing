import { describe, expect, it } from "vitest";
import { fetchUpcomingSchedules } from "./notion";

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
