/** Parse YYYY-MM-DD harvest date string to local midnight Date. */
export function parseHarvestDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const [y, m, d] = value.trim().split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isDateInHarvestRange(
  day: Date,
  start: Date | null,
  end: Date | null
): boolean {
  if (!start && !end) return false;
  const t = day.getTime();
  if (start && end) return t >= start.getTime() && t <= end.getTime();
  if (start) return t >= start.getTime();
  return t <= end!.getTime();
}

export type HarvestRangePosition = "single" | "start" | "middle" | "end";

export function getHarvestRangePosition(
  day: Date,
  start: Date | null,
  end: Date | null
): HarvestRangePosition | null {
  if (!isDateInHarvestRange(day, start, end)) return null;
  const isStart = start ? isSameDay(day, start) : false;
  const isEnd = end ? isSameDay(day, end) : false;
  if (isStart && isEnd) return "single";
  if (isStart) return "start";
  if (isEnd) return "end";
  return "middle";
}

export function getInitialCalendarMonth(
  start: Date | null,
  end: Date | null
): { year: number; month: number } {
  const anchor = start ?? end ?? new Date();
  return { year: anchor.getFullYear(), month: anchor.getMonth() };
}

/** Build a month grid: each day 1..N appears exactly once, padded to full weeks. */
export function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: (Date | null)[] = [];

  for (let i = 0; i < totalCells; i += 1) {
    const dayNum = i - startOffset + 1;
    if (dayNum >= 1 && dayNum <= daysInMonth) {
      cells.push(new Date(year, month, dayNum));
    } else {
      cells.push(null);
    }
  }

  return cells;
}

export function getHarvestCalendarTitle(
  productTitle?: string | null,
  commodityName?: string | null
): string {
  const name = productTitle?.trim() || commodityName?.trim() || "Product";
  return `Harvest Calendar: ${name}`;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
