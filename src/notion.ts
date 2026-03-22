import { formatIsoLikeForKst } from "./time";
import type { NotionScheduleItem } from "./types";

type NotionPage = {
  properties?: Record<string, NotionProperty>;
};

type NotionDateProperty = {
  type: "date";
  date: {
    start: string | null;
    end: string | null;
  } | null;
};

type NotionTitleProperty = {
  type: "title";
  title: Array<{
    plain_text?: string;
  }>;
};

type NotionProperty = NotionDateProperty | NotionTitleProperty | { type: string; [key: string]: unknown };

type NotionQueryResponse = {
  results?: NotionPage[];
};

function extractTitle(properties: Record<string, NotionProperty>): string {
  const titleProperty = Object.values(properties).find((property) => property.type === "title") as NotionTitleProperty | undefined;
  if (!titleProperty || !Array.isArray(titleProperty.title) || titleProperty.title.length === 0) {
    return "(제목 없음)";
  }

  const text = titleProperty.title.map((item) => item.plain_text ?? "").join("").trim();
  return text || "(제목 없음)";
}

function isUpcoming(dateValue: { start: string | null; end: string | null }, today: string): boolean {
  const endCandidate = dateValue.end ? dateValue.end.slice(0, 10) : null;
  const startCandidate = dateValue.start ? dateValue.start.slice(0, 10) : null;

  if (endCandidate) {
    return endCandidate > today;
  }

  if (startCandidate) {
    return startCandidate > today;
  }

  return false;
}

function sortSchedules(items: NotionScheduleItem[]): NotionScheduleItem[] {
  return [...items].sort((left, right) => left.start.localeCompare(right.start));
}

export async function fetchUpcomingSchedules(
  token: string,
  databaseId: string,
  dateProperty: string,
  today: string
): Promise<NotionScheduleItem[]> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      page_size: 100,
      filter: {
        or: [
          {
            property: dateProperty,
            date: {
              after: today
            }
          },
          {
            property: dateProperty,
            date: {
              on_or_after: today
            }
          }
        ]
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Notion request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as NotionQueryResponse;
  const results = payload.results ?? [];

  const schedules: NotionScheduleItem[] = [];

  for (const page of results) {
    const properties = page.properties ?? {};
    const dateField = properties[dateProperty] as NotionDateProperty | undefined;
    if (!dateField || dateField.type !== "date" || !dateField.date) {
      continue;
    }

    if (!isUpcoming(dateField.date, today)) {
      continue;
    }

    schedules.push({
      title: extractTitle(properties),
      start: dateField.date.start ? formatIsoLikeForKst(dateField.date.start) : "",
      end: dateField.date.end ? formatIsoLikeForKst(dateField.date.end) : null
    });
  }

  return sortSchedules(schedules);
}
