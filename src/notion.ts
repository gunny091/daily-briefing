import { formatIsoLikeForKst, toKstDateString } from "./time";
import type { NotionPageLink, NotionScheduleItem } from "./types";

type NotionPage = {
  id?: string;
  properties?: Record<string, NotionProperty>;
  url?: string;
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

type NotionDatabaseProperty = {
  id?: string;
  name?: string;
  type: string;
};

type NotionProperty = NotionDateProperty | NotionTitleProperty | { type: string; [key: string]: unknown };

type NotionQueryResponse = {
  results?: NotionPage[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type NotionDatabaseResponse = {
  properties?: Record<string, NotionDatabaseProperty>;
};

type NotionCreatePageResponse = {
  url?: string;
};

function buildHeaders(token: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
  };
}

async function notionRequest<T>(token: string, url: string, init: RequestInit, errorPrefix: string): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(token),
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new Error(`${errorPrefix} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function extractTitle(properties: Record<string, NotionProperty>): string {
  const titleProperty = Object.values(properties).find((property) => property.type === "title") as NotionTitleProperty | undefined;
  if (!titleProperty || !Array.isArray(titleProperty.title) || titleProperty.title.length === 0) {
    return "(제목 없음)";
  }

  const text = titleProperty.title.map((item) => item.plain_text ?? "").join("").trim();
  return text || "(제목 없음)";
}

function isUpcoming(dateValue: { start: string | null; end: string | null }, today: string): boolean {
  const endCandidate = toKstDateOnly(dateValue.end);
  const startCandidate = toKstDateOnly(dateValue.start);

  if (endCandidate) {
    return endCandidate >= today;
  }

  if (startCandidate) {
    return startCandidate >= today;
  }

  return false;
}

function sortSchedules(items: NotionScheduleItem[]): NotionScheduleItem[] {
  return [...items].sort((left, right) => left.start.localeCompare(right.start));
}

function isDateOnlyStart(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toKstDateOnly(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (isDateOnlyStart(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toKstDateString(parsed);
}

function formatScheduleDateForDisplay(value: string | null): string {
  if (!value) {
    return "";
  }

  if (isDateOnlyStart(value)) {
    return value;
  }

  return formatIsoLikeForKst(value);
}

async function queryDatabase(token: string, databaseId: string, body: Record<string, unknown>): Promise<NotionQueryResponse> {
  return notionRequest<NotionQueryResponse>(
    token,
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    "Notion request"
  );
}

async function queryAllDatabasePages(
  token: string,
  databaseId: string,
  body: Record<string, unknown>
): Promise<NotionPage[]> {
  const results: NotionPage[] = [];
  let startCursor: string | undefined;

  while (true) {
    const payload = await queryDatabase(token, databaseId, {
      ...body,
      start_cursor: startCursor
    });

    results.push(...(payload.results ?? []));

    if (!payload.has_more || !payload.next_cursor) {
      return results;
    }

    startCursor = payload.next_cursor;
  }
}

async function getDatabase(token: string, databaseId: string): Promise<NotionDatabaseResponse> {
  return notionRequest<NotionDatabaseResponse>(
    token,
    `https://api.notion.com/v1/databases/${databaseId}`,
    {
      method: "GET"
    },
    "Notion database request"
  );
}

async function createPage(
  token: string,
  databaseId: string,
  titlePropertyName: string,
  title: string,
  dateProperty: string,
  today: string
): Promise<NotionCreatePageResponse> {
  return notionRequest<NotionCreatePageResponse>(
    token,
    "https://api.notion.com/v1/pages",
    {
      method: "POST",
      body: JSON.stringify({
        parent: {
          database_id: databaseId
        },
        properties: {
          [titlePropertyName]: {
            title: [
              {
                text: {
                  content: title
                }
              }
            ]
          },
          [dateProperty]: {
            date: {
              start: today
            }
          }
        }
      })
    },
    "Notion create page request"
  );
}

function findTitlePropertyName(properties: Record<string, NotionDatabaseProperty>): string | null {
  for (const [name, property] of Object.entries(properties)) {
    if (property.type === "title") {
      return name;
    }
  }

  return null;
}

export async function fetchUpcomingSchedules(
  token: string,
  databaseId: string,
  dateProperty: string,
  today: string
): Promise<NotionScheduleItem[]> {
  const todayStart = `${today}T00:00:00+09:00`;
  const results = await queryAllDatabasePages(token, databaseId, {
    page_size: 100,
    sorts: [
      {
        property: dateProperty,
        direction: "ascending"
      }
    ],
    filter: {
      property: dateProperty,
      date: {
        on_or_after: todayStart
      }
    }
  });

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
      url: page.url ?? null,
      start: formatScheduleDateForDisplay(dateField.date.start),
      end: formatScheduleDateForDisplay(dateField.date.end) || null
    });
  }

  return sortSchedules(schedules);
}

export async function ensureTodayPage(
  token: string,
  databaseId: string,
  dateProperty: string,
  today: string
): Promise<NotionPageLink> {
  const results = await queryAllDatabasePages(token, databaseId, {
    page_size: 100,
    filter: {
      property: dateProperty,
      date: {
        equals: today
      }
    }
  });

  for (const page of results) {
    const properties = page.properties ?? {};
    const dateField = properties[dateProperty] as NotionDateProperty | undefined;
    const start = dateField?.type === "date" ? dateField.date?.start : null;
    const end = dateField?.type === "date" ? dateField.date?.end : null;
    const startDate = toKstDateOnly(start);

    if (startDate !== today || end !== null || !isDateOnlyStart(start)) {
      continue;
    }

    return {
      title: extractTitle(properties),
      url: page.url ?? null
    };
  }

  const database = await getDatabase(token, databaseId);
  const titlePropertyName = findTitlePropertyName(database.properties ?? {});
  if (!titlePropertyName) {
    throw new Error("Notion database is missing a title property");
  }

  const created = await createPage(token, databaseId, titlePropertyName, today, dateProperty, today);
  return {
    title: today,
    url: created.url ?? null
  };
}
