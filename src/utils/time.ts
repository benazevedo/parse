export const DAY_PLANNING_WINDOW = {
  startTime: "05:00",
  endTime: "23:00",
} as const;

export interface TimeRange {
  startTime: string;
  endTime: string;
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalTime(value: string): number | null {
  const match = value
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3];
  if (!Number.isInteger(hour) || minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (hour === 12) hour = 0;
    if (meridiem === "PM") hour += 12;
  } else if (hour < 0 || hour > 23) {
    return null;
  }

  return hour * 60 + minute;
}

export function normalizeLocalTime(value: string): string | null {
  const minutes = parseLocalTime(value);
  if (minutes === null) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function formatLocalTime(value: string): string {
  const minutes = parseLocalTime(value);
  if (minutes === null) return value;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function isValidTimeRange(range: TimeRange): boolean {
  const start = parseLocalTime(range.startTime);
  const end = parseLocalTime(range.endTime);
  return start !== null && end !== null && end > start;
}

export function rangesOverlap(left: TimeRange, right: TimeRange): boolean {
  const leftStart = parseLocalTime(left.startTime);
  const leftEnd = parseLocalTime(left.endTime);
  const rightStart = parseLocalTime(right.startTime);
  const rightEnd = parseLocalTime(right.endTime);
  if (
    leftStart === null ||
    leftEnd === null ||
    rightStart === null ||
    rightEnd === null
  ) {
    return false;
  }
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function getRangeDurationMinutes(range: TimeRange): number {
  const start = parseLocalTime(range.startTime);
  const end = parseLocalTime(range.endTime);
  return start === null || end === null ? 0 : Math.max(0, end - start);
}

export function compareTimeRanges(left: TimeRange, right: TimeRange): number {
  return (
    (parseLocalTime(left.startTime) ?? Number.MAX_SAFE_INTEGER) -
    (parseLocalTime(right.startTime) ?? Number.MAX_SAFE_INTEGER)
  );
}

export function getCurrentAndNextRange<T extends TimeRange>(
  ranges: T[],
  atMinutes: number,
): { current?: T; next?: T } {
  const sorted = [...ranges].sort(compareTimeRanges);
  const current = sorted.find((range) => {
    const start = parseLocalTime(range.startTime) ?? -1;
    const end = parseLocalTime(range.endTime) ?? -1;
    return start <= atMinutes && atMinutes < end;
  });
  const next = sorted.find(
    (range) => (parseLocalTime(range.startTime) ?? -1) > atMinutes,
  );
  return { current, next };
}

export function formatMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (!hours) return `${remainder}m`;
  if (!remainder) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function getRemainingUnscheduledMinutes(
  ranges: TimeRange[],
  window: TimeRange = DAY_PLANNING_WINDOW,
): number {
  const windowStart = parseLocalTime(window.startTime) ?? 0;
  const windowEnd = parseLocalTime(window.endTime) ?? 0;
  const occupied = ranges.reduce((total, range) => {
    const start = parseLocalTime(range.startTime);
    const end = parseLocalTime(range.endTime);
    if (start === null || end === null) return total;
    return (
      total +
      Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart))
    );
  }, 0);
  return Math.max(0, windowEnd - windowStart - occupied);
}

export function describeDurationComparison(
  scheduledMinutes: number,
  estimatedMinutes?: number,
): string {
  if (estimatedMinutes) {
    return `${scheduledMinutes} min scheduled · ${estimatedMinutes} min estimated`;
  }
  return `${scheduledMinutes} min scheduled`;
}
