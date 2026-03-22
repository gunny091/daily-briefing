import type { DDayItem, NotionScheduleItem, WeatherSummary } from "./types";

function formatNumber(value: number | null, suffix = ""): string {
  return value === null ? "정보 없음" : `${value}${suffix}`;
}

function formatCompactNumber(value: number | null): string {
  return value === null ? "정보 없음" : `${value}`;
}

function formatMonthDay(value: string): string {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!matched) {
    return value;
  }

  return `${Number(matched[2])}/${Number(matched[3])}`;
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
    `- 기온: ${formatCompactNumber(summary.currentTemperature)} (${formatCompactNumber(summary.maxTemperature)}/ ${formatCompactNumber(summary.minTemperature)})`,
    `- 자외선 지수: ${formatCompactNumber(summary.uvIndexMax)}`,
    `- 강수확률 ${formatCompactNumber(summary.precipitationProbabilityMax)}%, 강수량 ${formatCompactNumber(summary.precipitationAmountMax)}mm`
  ];

  if (summary.precipitationStartTime) {
    lines.push(`- 강수 시작 시간: ${summary.precipitationStartTime}`);
  }

  return lines.join("\n");
}

export function formatSchedulesSection(items: NotionScheduleItem[]): string {
  if (items.length === 0) {
    return "## Notion 일정\n- 오늘 이후 일정이 없습니다.";
  }

  const lines = items.map((item) => `- ${item.title}: ${formatMonthDay(item.start)}`);

  return ["## Notion 일정", ...lines].join("\n");
}

export function formatErrorSection(title: string, message: string): string {
  return `## ${title}\n- ${message}`;
}

export function buildBriefingMessage(input: {
  dateLabel: string;
  ddaySection: string;
  weatherSection: string;
  schedulesSection: string;
}): string {
  return [
    `# Daily Briefing - ${input.dateLabel}`,
    "",
    input.ddaySection,
    "",
    input.weatherSection,
    "",
    input.schedulesSection
  ].join("\n");
}
