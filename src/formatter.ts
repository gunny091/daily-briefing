import type { DDayItem, NotionPageLink, NotionScheduleItem, QuoteOfDay, WeatherSummary } from "./types";
import {
  PRECIPITATION_AMOUNT_DISPLAY_THRESHOLD,
  PRECIPITATION_PROBABILITY_DISPLAY_THRESHOLD
} from "./weather";

function formatNumber(value: number | null, suffix = ""): string {
  return value === null ? "정보 없음" : `${value}${suffix}`;
}

function formatCompactNumber(value: number | null): string {
  return value === null ? "정보 없음" : `${value}`;
}

function getUvIndexLabel(value: number): string {
  if (value <= 2) {
    return "낮음";
  }

  if (value <= 5) {
    return "보통";
  }

  if (value <= 7) {
    return "높음";
  }

  if (value <= 10) {
    return "매우 높음";
  }

  return "위험";
}

function formatUvIndex(value: number | null): string {
  if (value === null) {
    return "정보 없음";
  }

  return `${value} (${getUvIndexLabel(value)})`;
}

function formatPrecipitationLine(summary: WeatherSummary): string | null {
  const shouldDisplay =
    (summary.precipitationProbabilityMax ?? 0) >= PRECIPITATION_PROBABILITY_DISPLAY_THRESHOLD ||
    (summary.precipitationAmountSum ?? 0) >= PRECIPITATION_AMOUNT_DISPLAY_THRESHOLD;

  if (!shouldDisplay) {
    return null;
  }

  const parts = [];

  if (summary.precipitationProbabilityMax !== null) {
    parts.push(`강수확률 ${formatCompactNumber(summary.precipitationProbabilityMax)}%`);
  }

  if (summary.precipitationAmountSum !== null) {
    parts.push(`강수량 ${formatCompactNumber(summary.precipitationAmountSum)}mm`);
  }

  return parts.length > 0 ? `- ${parts.join(", ")}` : null;
}

function formatScheduleLabel(value: string): string {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (!matched) {
    return value;
  }

  const monthDay = `${Number(matched[2])}/${Number(matched[3])}`;
  if (matched[4] && matched[5]) {
    return `${monthDay} ${matched[4]}:${matched[5]}`;
  }

  return monthDay;
}

export function formatDdaySection(items: DDayItem[]): string {
  if (items.length === 0) {
    return "- 설정된 항목이 없습니다.";
  }

  return items.map((item) => `- ${item.name}: ${item.label}`).join("\n");
}

export function formatWeatherSection(summary: WeatherSummary): string {
  const lines = [
    "## 날씨",
    `- ${summary.conditionLabel}`,
    `- 기온: ${formatCompactNumber(summary.currentTemperature)} (${formatCompactNumber(summary.maxTemperature)} / ${formatCompactNumber(summary.minTemperature)})`,
    `- 자외선 지수: ${formatUvIndex(summary.uvIndexMax)}`
  ];

  const precipitationLine = formatPrecipitationLine(summary);
  if (precipitationLine) {
    lines.push(precipitationLine);
  }

  if (summary.precipitationStartTime) {
    lines.push(`- 강수 시작 시간: ${summary.precipitationStartTime}`);
  }

  return lines.join("\n");
}

export function formatSchedulesSection(items: NotionScheduleItem[]): string {
  if (items.length === 0) {
    return "## Notion 일정\n- 오늘 이후 일정이 없습니다.";
  }

  const lines = items.map((item) => {
    const title = item.url ? `[${item.title}](${item.url})` : item.title;
    return `- ${title}: ${formatScheduleLabel(item.start)}`;
  });

  return ["## Notion 일정", ...lines].join("\n");
}

export function formatTodayPageLink(item: NotionPageLink): string {
  const title = item.url ? `[${item.title}](${item.url})` : item.title;
  return `오늘 페이지: ${title}`;
}

export function formatTodayPageError(message: string): string {
  return `오늘 페이지: ${message}`;
}

export function formatErrorSection(title: string, message: string): string {
  return `## ${title}\n- ${message}`;
}

export function formatQuoteSection(quote: QuoteOfDay): string {
  return ["## 오늘의 명언", `> ${quote.quote}`, `> - ${quote.author}`].join("\n");
}

export function buildBriefingMessage(input: {
  dateLabel: string;
  todayPageLinkLine: string;
  ddaySection: string;
  weatherSection: string;
  schedulesSection: string;
  quoteSection: string;
}): string {
  return [
    `# Daily Briefing - ${input.dateLabel}`,
    input.todayPageLinkLine,
    "",
    input.ddaySection,
    "",
    input.weatherSection,
    "",
    input.schedulesSection,
    "",
    input.quoteSection
  ].join("\n");
}
