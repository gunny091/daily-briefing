import { describe, expect, it } from "vitest";
import { buildBriefingMessage, formatSchedulesSection, formatWeatherSection } from "./formatter";

describe("formatWeatherSection", () => {
  it("includes current, high/low, precipitation and uv", () => {
    const section = formatWeatherSection({
      locationLabel: "와부읍",
      conditionLabel: "맑음",
      currentTemperature: 10,
      minTemperature: 3,
      maxTemperature: 12,
      uvIndexMax: 5,
      precipitationProbabilityMax: 30,
      precipitationAmountMax: 1.2,
      precipitationStartTime: "09:00",
      hourlyPrecipitation: [{ time: "09:00", probability: 30, amount: 1.2 }]
    });

    expect(section).toContain("- 맑음");
    expect(section).toContain("기온: 10 (12/ 3)");
    expect(section).toContain("자외선 지수: 5");
    expect(section).toContain("강수확률 30%, 강수량 1.2mm");
    expect(section).toContain("강수 시작 시간: 09:00");
  });

  it("handles missing optional weather values", () => {
    const section = formatWeatherSection({
      locationLabel: "와부읍",
      conditionLabel: "날씨 정보 없음",
      currentTemperature: null,
      minTemperature: null,
      maxTemperature: null,
      uvIndexMax: null,
      precipitationProbabilityMax: null,
      precipitationAmountMax: null,
      precipitationStartTime: null,
      hourlyPrecipitation: []
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
      { title: "회의", start: "2026-03-23 09:00 KST", end: null }
    ]);

    expect(section).toContain("회의");
    expect(section).toContain("3/23");
  });
});

describe("buildBriefingMessage", () => {
  it("keeps section order", () => {
    const message = buildBriefingMessage({
      dateLabel: "2026-03-22",
      ddaySection: "D",
      weatherSection: "W",
      schedulesSection: "N"
    });

    expect(message).toMatch(/2026-03-22/);
    expect(message.indexOf("D")).toBeLessThan(message.indexOf("W"));
    expect(message.indexOf("W")).toBeLessThan(message.indexOf("N"));
  });
});
