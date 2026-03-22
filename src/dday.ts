import { diffDaysKst } from "./time";
import type { DDayConfig, DDayItem } from "./types";

export function formatDdayLabel(diffDays: number): string {
  if (diffDays === 0) {
    return "D-day";
  }

  if (diffDays > 0) {
    return `D-${diffDays}`;
  }

  return `D+${Math.abs(diffDays)}`;
}

export function buildDdayItems(ddays: DDayConfig[], today: string): DDayItem[] {
  return ddays.map((item) => ({
    name: item.name,
    date: item.date,
    label: formatDdayLabel(diffDaysKst(item.date, today))
  }));
}
