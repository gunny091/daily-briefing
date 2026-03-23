import { loadConfig } from "./config";
import { buildDdayItems } from "./dday";
import { sendDiscordWebhook } from "./discord";
import { buildBriefingMessage, formatDdaySection, formatErrorSection, formatQuoteSection, formatSchedulesSection, formatTodayPageError, formatTodayPageLink, formatWeatherSection } from "./formatter";
import { ensureTodayPage, fetchUpcomingSchedules } from "./notion";
import { fetchQuoteOfTheDay } from "./quote";
import { toKstDateString } from "./time";
import { fetchWeatherSummary } from "./weather";

async function main(): Promise<void> {
  const config = loadConfig();
  const today = toKstDateString();

  const ddaySection = formatDdaySection(buildDdayItems(config.ddays, today));

  const todayPageLinkPromise = ensureTodayPage(
    config.notion.token,
    config.notion.dailyPage.databaseId,
    config.notion.dailyPage.dateProperty,
    today
  )
    .then((page) => formatTodayPageLink(page))
    .catch((error: unknown) =>
      formatTodayPageError(error instanceof Error ? `링크를 가져오지 못했습니다: ${error.message}` : "링크를 가져오지 못했습니다.")
    );

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

  const quoteSectionPromise = fetchQuoteOfTheDay()
    .then((quote) => formatQuoteSection(quote))
    .catch((error: unknown) =>
      formatErrorSection("오늘의 명언", error instanceof Error ? `명언을 가져오지 못했습니다: ${error.message}` : "명언을 가져오지 못했습니다.")
    );

  const [todayPageLinkLine, weatherSection, schedulesSection, quoteSection] = await Promise.all([
    todayPageLinkPromise,
    weatherSectionPromise,
    scheduleSectionPromise,
    quoteSectionPromise
  ]);

  const content = buildBriefingMessage({
    dateLabel: today,
    todayPageLinkLine,
    ddaySection,
    weatherSection,
    schedulesSection,
    quoteSection
  });

  await sendDiscordWebhook(config.discord.webhookUrl, content);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[daily-briefing] ${message}`);
  process.exitCode = 1;
});
