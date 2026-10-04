import type {
  RecurrenceRule,
  RecurringCommitment,
  RecurringCommitmentOccurrence,
  RecurringCommitmentOverride,
  Routine,
  RoutineOccurrence,
  RoutineOccurrenceState,
  Weekday,
} from "../types/recurrence";
import { WEEKDAYS } from "../types/recurrence";
import { normalizeLocalTime } from "./time";

export function parseLocalDateKey(dateKey: string): Date | null {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isValidLocalDateKey(dateKey: string): boolean {
  return parseLocalDateKey(dateKey) !== null;
}

export function getLocalWeekday(dateKey: string): Weekday | null {
  const date = parseLocalDateKey(dateKey);
  return date ? WEEKDAYS[date.getDay()] : null;
}

export function addLocalDays(dateKey: string, amount: number): string {
  const date = parseLocalDateKey(dateKey);
  if (!date) return dateKey;
  date.setDate(date.getDate() + amount);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMondayWeek(dateKey: string): string[] {
  const weekday = getLocalWeekday(dateKey);
  const weekdayIndex = weekday ? WEEKDAYS.indexOf(weekday) : 1;
  const mondayOffset = weekdayIndex === 0 ? -6 : 1 - weekdayIndex;
  const monday = addLocalDays(dateKey, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addLocalDays(monday, index));
}

function enabledForDate(
  enabled: boolean,
  disabledFromDate: string | undefined,
  date: string,
): boolean {
  if (enabled) return true;
  return Boolean(disabledFromDate && date < disabledFromDate);
}

export function recurrenceAppliesOnDate(
  rule: RecurrenceRule | undefined,
  date: string,
): boolean {
  if (!rule || !isValidLocalDateKey(date)) return false;
  if (!enabledForDate(rule.enabled, rule.disabledFromDate, date)) return false;
  if (date < rule.startDate || (rule.endDate && date > rule.endDate)) {
    return false;
  }

  const weekday = getLocalWeekday(date);
  if (!weekday) return false;
  if (rule.frequency === "daily") return true;
  if (rule.frequency === "selected_weekdays") {
    return Boolean(rule.selectedWeekdays?.includes(weekday));
  }
  return weekday === getLocalWeekday(rule.startDate);
}

export function recurringOccurrenceId(templateId: string, date: string) {
  return `recurring:${templateId}:${date}`;
}

export function routineOccurrenceId(routineId: string, date: string) {
  return `routine:${routineId}:${date}`;
}

export function getRecurringCommitmentOccurrences(
  date: string,
  rules: RecurrenceRule[],
  templates: RecurringCommitment[],
  overrides: RecurringCommitmentOverride[],
): RecurringCommitmentOccurrence[] {
  return templates.flatMap((template) => {
    const rule = rules.find((item) => item.id === template.recurrenceRuleId);
    const override = overrides.find(
      (item) =>
        item.recurringCommitmentId === template.id && item.date === date,
    );
    const patternApplies = recurrenceAppliesOnDate(rule, date);
    const templateEnabled = enabledForDate(
      template.enabled,
      template.disabledFromDate,
      date,
    );
    if (!templateEnabled || (!patternApplies && !override)) return [];
    if (override?.kind === "skip") return [];

    const startTime = normalizeLocalTime(
      override?.startTime ?? template.startTime,
    );
    const endTime = normalizeLocalTime(override?.endTime ?? template.endTime);
    if (!rule || !startTime || !endTime) return [];
    return [
      {
        id: recurringOccurrenceId(template.id, date),
        date,
        title: override?.title ?? template.title,
        startTime,
        endTime,
        notes: override?.notes ?? template.notes,
        recurringCommitmentId: template.id,
        recurrenceRuleId: rule.id,
        overrideId: override?.id,
      },
    ];
  });
}

export function getRoutineOccurrences(
  date: string,
  rules: RecurrenceRule[],
  routines: Routine[],
  states: RoutineOccurrenceState[],
): RoutineOccurrence[] {
  return routines.flatMap((routine) => {
    const rule = rules.find((item) => item.id === routine.recurrenceRuleId);
    if (
      !enabledForDate(routine.enabled, routine.disabledFromDate, date) ||
      !recurrenceAppliesOnDate(rule, date)
    ) {
      return [];
    }
    const state = states.find(
      (item) => item.routineId === routine.id && item.date === date,
    );
    return [
      {
        id: routineOccurrenceId(routine.id, date),
        date,
        routine,
        status: state?.status ?? "pending",
        linkedTaskId: state?.linkedTaskId,
      },
    ];
  });
}

export function describeRecurrence(rule: RecurrenceRule | undefined): string {
  if (!rule) return "Schedule unavailable";
  if (rule.frequency === "daily") return "Every day";
  if (rule.frequency === "weekly") {
    const weekday = getLocalWeekday(rule.startDate);
    return weekday ? `Every ${weekday.toUpperCase()}` : "Weekly";
  }
  const labels = (rule.selectedWeekdays ?? []).map((day) => day.toUpperCase());
  return labels.length ? labels.join(" · ") : "Choose weekdays";
}
