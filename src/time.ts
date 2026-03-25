const KST_OFFSET_HOURS = 9;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getKstNow(reference = new Date()): Date {
  return new Date(reference.getTime() + KST_OFFSET_HOURS * 60 * 60_000);
}

export function toKstDateString(reference = new Date()): string {
  return getKstNow(reference).toISOString().slice(0, 10);
}

export function parseDateOnlyToUtc(date: string): Date {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!matched) {
    throw new Error(`Invalid date format: ${date}`);
  }

  const [, year, month, day] = matched;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

export function diffDaysKst(targetDate: string, baseDate: string): number {
  const target = parseDateOnlyToUtc(targetDate);
  const base = parseDateOnlyToUtc(baseDate);
  return Math.round((target.getTime() - base.getTime()) / DAY_IN_MS);
}

export function formatIsoLikeForKst(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  const kst = getKstNow(parsed);
  const date = kst.toISOString().slice(0, 10);
  const time = kst.toISOString().slice(11, 16);
  return `${date} ${time} KST`;
}
