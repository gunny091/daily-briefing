import { describe, expect, it } from "vitest";
import { buildDdayItems, formatDdayLabel } from "./dday";

describe("formatDdayLabel", () => {
  it("formats today", () => {
    expect(formatDdayLabel(0)).toBe("D-day");
  });

  it("formats future date", () => {
    expect(formatDdayLabel(3)).toBe("D-3");
  });

  it("formats past date", () => {
    expect(formatDdayLabel(-2)).toBe("D+2");
  });
});

describe("buildDdayItems", () => {
  it("builds labels relative to today", () => {
    const items = buildDdayItems(
      [
        { name: "today", date: "2026-03-22" },
        { name: "future", date: "2026-03-25" },
        { name: "past", date: "2026-03-20" }
      ],
      "2026-03-22"
    );

    expect(items.map((item) => item.label)).toEqual(["D-day", "D-3", "D+2"]);
  });
});
