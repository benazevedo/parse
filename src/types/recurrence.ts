export const WEEKDAYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type RecurrenceFrequency = "daily" | "selected_weekdays" | "weekly";

export interface RecurrenceRule {
  id: string;
  frequency: RecurrenceFrequency;
  selectedWeekdays?: Weekday[];
  startDate: string;
  endDate?: string;
  enabled: boolean;
  createdAt: string;
  disabledFromDate?: string;
}

export interface RecurringCommitment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  recurrenceRuleId: string;
  notes?: string;
  enabled: boolean;
  createdAt: string;
  disabledFromDate?: string;
}

export type RecurrenceOverrideKind = "edit" | "skip";

export interface RecurringCommitmentOverride {
  id: string;
  recurringCommitmentId: string;
  date: string;
  kind: RecurrenceOverrideKind;
  title?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  createdAt: string;
}

export interface RecurringCommitmentOccurrence {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
  recurringCommitmentId: string;
  recurrenceRuleId: string;
  overrideId?: string;
}

export type RoutineDomain =
  "family" | "faith" | "fitness" | "home" | "learning" | "personal";

export interface Routine {
  id: string;
  title: string;
  recurrenceRuleId: string;
  estimatedMinutes?: number;
  defaultTime?: string;
  domain?: RoutineDomain;
  enabled: boolean;
  createdAt: string;
  disabledFromDate?: string;
}

export type RoutineOccurrenceStatus = "pending" | "completed" | "skipped";

export interface RoutineOccurrenceState {
  id: string;
  routineId: string;
  date: string;
  status: RoutineOccurrenceStatus;
  linkedTaskId?: string;
  updatedAt: string;
}

export interface RoutineOccurrence {
  id: string;
  date: string;
  routine: Routine;
  status: RoutineOccurrenceStatus;
  linkedTaskId?: string;
}

export interface RecurrencePatternInput {
  frequency: RecurrenceFrequency;
  selectedWeekdays?: Weekday[];
  startDate: string;
  endDate?: string;
  enabled: boolean;
}

export interface RecurringCommitmentInput extends RecurrencePatternInput {
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface RoutineInput extends RecurrencePatternInput {
  title: string;
  estimatedMinutes?: number;
  defaultTime?: string;
  domain?: RoutineDomain;
}

export interface RecurrenceActionResult {
  ok: boolean;
  message?: string;
  id?: string;
  taskId?: string;
}
