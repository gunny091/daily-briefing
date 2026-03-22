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
              properties: {
                제목: { type: "title", title: [{ plain_text: "출장" }] },
                일정: { type: "date", date: { start: "2026-03-20T09:00:00.000Z", end: "2026-03-23T09:00:00.000Z" } }
              }
            },
            {
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
    } finally {
      global.fetch = originalFetch;
    }
  });
});
