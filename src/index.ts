import { loadConfig } from "./config";
import { buildDdayItems } from "./dday";
import { sendDiscordWebhook } from "./discord";
import { buildBriefingMessage, formatDdaySection, formatErrorSection, formatSchedulesSection, formatWeatherSection } from "./formatter";
import { fetchUpcomingSchedules } from "./notion";
import { toKstDateString } from "./time";
import { fetchWeatherSummary } from "./weather";

async function main(): Promise<void> {
  const config = loadConfig();
  const today = toKstDateString();

  const ddaySection = formatDdaySection(buildDdayItems(config.ddays, today));

  const weatherSectionPromise = fetchWeatherSummary(
    config.weather.latitude,
    config.weather.longitude,
    config.weather.label,
    today
  )
    .then((summary) => formatWeatherSection(summary))
    .catch((error: unknown) =>
      formatErrorSection("날씨", error instanceof Error ? `날씨 정보를 가져오지 못했습니다: ${error.message}` : "날씨 정보를 가져오지 못했습니다.")
    );

  const scheduleSectionPromise = fetchUpcomingSchedules(
    config.notion.token,
    config.notion.databaseId,
    config.notion.dateProperty,
    today
  )
    .then((items) => formatSchedulesSection(items))
    .catch((error: unknown) =>
      formatErrorSection("Notion 일정", error instanceof Error ? `일정을 가져오지 못했습니다: ${error.message}` : "일정을 가져오지 못했습니다.")
    );

  const [weatherSection, schedulesSection] = await Promise.all([weatherSectionPromise, scheduleSectionPromise]);

  const content = buildBriefingMessage({
    dateLabel: today,
    ddaySection,
    weatherSection,
    schedulesSection
  });

  await sendDiscordWebhook(config.discord.webhookUrl, content);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[daily-briefing] ${message}`);
  process.exitCode = 1;
});
