import { describe, expect, it } from "vitest";
import { buildBriefingMessage, formatQuoteSection, formatSchedulesSection, formatTodayPageError, formatTodayPageLink, formatWeatherSection } from "./formatter";

describe("formatWeatherSection", () => {
  it("includes current, high/low, precipitation and uv", () => {
    const section = formatWeatherSection({
      conditionLabel: "맑음",
      currentTemperature: 10,
      minTemperature: 3,
      maxTemperature: 12,
      uvIndexMax: 5,
      precipitationProbabilityMax: 30,
      precipitationAmountMax: 1.2,
      precipitationStartTime: "09:00"
    });

    expect(section).toContain("- 맑음");
    expect(section).toContain("기온: 10 (12/ 3)");
    expect(section).toContain("자외선 지수: 5");
    expect(section).toContain("강수확률 30%, 강수량 1.2mm");
    expect(section).toContain("강수 시작 시간: 09:00");
  });

  it("handles missing optional weather values", () => {
    const section = formatWeatherSection({
      conditionLabel: "날씨 정보 없음",
      currentTemperature: null,
      minTemperature: null,
      maxTemperature: null,
      uvIndexMax: null,
      precipitationProbabilityMax: null,
      precipitationAmountMax: null,
      precipitationStartTime: null
    });

    expect(section).toContain("정보 없음");
    expect(section).not.toContain("강수 시작 시간");
  });
});

describe("formatSchedulesSection", () => {
  it("renders empty state", () => {
    expect(formatSchedulesSection([])).toContain("오늘 이후 일정이 없습니다");
  });

  it("renders upcoming items", () => {
    const section = formatSchedulesSection([
      { title: "회의", url: "https://notion.so/example", start: "2026-03-23 09:00 KST", end: null }
    ]);

    expect(section).toContain("[회의](https://notion.so/example)");
    expect(section).toContain("3/23 09:00");
  });

  it("renders date-only items without a time", () => {
    const section = formatSchedulesSection([
      { title: "종일 일정", url: null, start: "2026-03-23", end: null }
    ]);

    expect(section).toContain("3/23");
    expect(section).not.toContain("3/23 ");
  });
});

describe("formatTodayPageLink", () => {
  it("renders today page link", () => {
    expect(formatTodayPageLink({ title: "2026-03-23", url: "https://notion.so/today" })).toBe(
      "오늘 페이지: [2026-03-23](https://notion.so/today)"
    );
  });

  it("renders today page error message", () => {
    expect(formatTodayPageError("링크를 가져오지 못했습니다.")).toBe("오늘 페이지: 링크를 가져오지 못했습니다.");
  });
});

describe("buildBriefingMessage", () => {
  it("keeps section order", () => {
    const message = buildBriefingMessage({
      dateLabel: "2026-03-22",
      todayPageLinkLine: "TODAY_LINE",
      ddaySection: "DDAY_LINE",
      weatherSection: "WEATHER_LINE",
      schedulesSection: "NOTION_LINE",
      quoteSection: "QUOTE_LINE"
    });
    const lines = message.split("\n");

    expect(message).toMatch(/2026-03-22/);
    expect(lines.indexOf("TODAY_LINE")).toBeLessThan(lines.indexOf("DDAY_LINE"));
    expect(lines.indexOf("DDAY_LINE")).toBeLessThan(lines.indexOf("WEATHER_LINE"));
    expect(lines.indexOf("WEATHER_LINE")).toBeLessThan(lines.indexOf("NOTION_LINE"));
    expect(lines.indexOf("NOTION_LINE")).toBeLessThan(lines.indexOf("QUOTE_LINE"));
  });
});

describe("formatQuoteSection", () => {
  it("renders quote block format", () => {
    const section = formatQuoteSection({
      quote: "This is quote",
      author: "Author"
    });

    expect(section).toContain("## 오늘의 명언");
    expect(section).toContain("> This is quote");
    expect(section).toContain("> - Author");
  });
});
