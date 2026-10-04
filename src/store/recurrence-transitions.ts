import { addTaskToToday, markTaskComplete } from "./task-transitions";
import type { DayPlan } from "../types/planning";
import type {
  RecurrenceActionResult,
  RecurrenceRule,
  RecurringCommitment,
  RecurringCommitmentInput,
  RecurringCommitmentOverride,
  Routine,
  RoutineInput,
  RoutineOccurrenceState,
} from "../types/recurrence";
import type { Task, TaskPriority } from "../types/task";
import {
  addLocalDays,
  getRecurringCommitmentOccurrences,
  getRoutineOccurrences,
  isValidLocalDateKey,
  recurrenceAppliesOnDate,
  routineOccurrenceId,
} from "../utils/recurrence";
import {
  formatLocalTime,
  isValidTimeRange,
  normalizeLocalTime,
  rangesOverlap,
} from "../utils/time";

export interface RecurrenceState {
  tasks: Task[];
  dayPlans: DayPlan[];
  recurrenceRules: RecurrenceRule[];
  recurringCommitments: RecurringCommitment[];
  recurrenceOverrides: RecurringCommitmentOverride[];
  routines: Routine[];
  routineStates: RoutineOccurrenceState[];
}

export interface RecurrenceTransition
  extends RecurrenceActionResult, RecurrenceState {}

function unchanged(
  state: RecurrenceState,
  message: string,
): RecurrenceTransition {
  return { ...state, ok: false, message };
}

function changed(
  state: RecurrenceState,
  result: Omit<RecurrenceActionResult, "ok"> = {},
): RecurrenceTransition {
  return { ...state, ...result, ok: true };
}

function validEstimate(value?: number): boolean {
  return value === undefined || (Number.isInteger(value) && value > 0);
}

function validatePattern(input: RecurringCommitmentInput | RoutineInput) {
  if (!isValidLocalDateKey(input.startDate)) {
    return "Use a start date like 2026-10-05.";
  }
  if (input.endDate && !isValidLocalDateKey(input.endDate)) {
    return "Use an end date like 2026-12-31.";
  }
  if (input.endDate && input.endDate < input.startDate) {
    return "End date cannot be before start date.";
  }
  if (
    input.frequency === "selected_weekdays" &&
    !input.selectedWeekdays?.length
  ) {
    return "Choose at least one weekday.";
  }
}

function makeRule(
  input: RecurringCommitmentInput | RoutineInput,
  id: string,
  createdAt: string,
  existing: RecurrenceRule | undefined,
  effectiveDate: string,
): RecurrenceRule {
  return {
    id,
    frequency: input.frequency,
    selectedWeekdays:
      input.frequency === "selected_weekdays"
        ? [...new Set(input.selectedWeekdays)]
        : undefined,
    startDate: input.startDate,
    endDate: input.endDate?.trim() || undefined,
    enabled: input.enabled,
    createdAt: existing?.createdAt ?? createdAt,
    disabledFromDate: input.enabled
      ? undefined
      : (existing?.disabledFromDate ?? effectiveDate),
  };
}

function conflictMessage(title: string, startTime: string, endTime: string) {
  return `${title} already occupies ${formatLocalTime(startTime)}–${formatLocalTime(endTime)}.`;
}

function activeTaskBlocks(state: RecurrenceState, date: string) {
  const plan = state.dayPlans.find((item) => item.date === date);
  return (plan?.timeBlocks ?? []).filter((block) => {
    const task = state.tasks.find((item) => item.id === block.taskId);
    return Boolean(task && task.today && task.status !== "completed");
  });
}

function findOccurrenceConflict(
  state: RecurrenceState,
  date: string,
  range: { startTime: string; endTime: string },
  excludedRecurringId?: string,
): { title: string; startTime: string; endTime: string } | undefined {
  const plan = state.dayPlans.find((item) => item.date === date);
  const oneOff = plan?.commitments.find((item) => rangesOverlap(range, item));
  if (oneOff) return oneOff;

  const recurring = getRecurringCommitmentOccurrences(
    date,
    state.recurrenceRules,
    state.recurringCommitments,
    state.recurrenceOverrides,
  ).find(
    (item) =>
      item.recurringCommitmentId !== excludedRecurringId &&
      rangesOverlap(range, item),
  );
  if (recurring) return recurring;

  const taskBlock = activeTaskBlocks(state, date).find((item) =>
    rangesOverlap(range, item),
  );
  if (taskBlock) {
    return {
      ...taskBlock,
      title:
        state.tasks.find((item) => item.id === taskBlock.taskId)?.title ??
        "A scheduled task",
    };
  }
}

function findSeriesConflict(
  state: RecurrenceState,
  template: RecurringCommitment,
  rule: RecurrenceRule,
): { title: string; startTime: string; endTime: string } | undefined {
  if (!template.enabled || !rule.enabled) return undefined;
  const candidateStarts = new Set([
    rule.startDate,
    ...state.recurrenceRules.map((item) => item.startDate),
    ...state.dayPlans.map((plan) => plan.date),
  ]);
  for (const candidate of candidateStarts) {
    const start = candidate > rule.startDate ? candidate : rule.startDate;
    for (let index = 0; index < 14; index += 1) {
      const date = addLocalDays(start, index);
      if (rule.endDate && date > rule.endDate) break;
      if (!recurrenceAppliesOnDate(rule, date)) continue;
      const conflict = findOccurrenceConflict(
        state,
        date,
        template,
        template.id,
      );
      if (conflict) return conflict;
    }
  }
}

export function saveRecurringCommitmentTransition(
  state: RecurrenceState,
  input: RecurringCommitmentInput,
  templateId: string,
  ruleId: string,
  createdAt: string,
  effectiveDate: string,
): RecurrenceTransition {
  const title = input.title.trim();
  const notes = input.notes?.trim();
  if (!title) return unchanged(state, "Add a title for this commitment.");
  const patternError = validatePattern(input);
  if (patternError) return unchanged(state, patternError);
  const startTime = normalizeLocalTime(input.startTime);
  const endTime = normalizeLocalTime(input.endTime);
  if (!startTime || !endTime) {
    return unchanged(state, "Enter times like 6:00 AM or 18:00.");
  }
  if (!isValidTimeRange({ startTime, endTime })) {
    return unchanged(state, "End time must be after start time.");
  }

  const existing = state.recurringCommitments.find(
    (item) => item.id === templateId,
  );
  const existingRule = state.recurrenceRules.find(
    (item) => item.id === existing?.recurrenceRuleId,
  );
  const rule = makeRule(
    input,
    existingRule?.id ?? ruleId,
    createdAt,
    existingRule,
    effectiveDate,
  );
  const template: RecurringCommitment = {
    id: templateId,
    title,
    startTime,
    endTime,
    recurrenceRuleId: rule.id,
    notes: notes || undefined,
    enabled: input.enabled,
    createdAt: existing?.createdAt ?? createdAt,
    disabledFromDate: input.enabled
      ? undefined
      : (existing?.disabledFromDate ?? effectiveDate),
  };
  const withoutCurrent: RecurrenceState = {
    ...state,
    recurrenceRules: state.recurrenceRules.filter(
      (item) => item.id !== rule.id,
    ),
    recurringCommitments: state.recurringCommitments.filter(
      (item) => item.id !== template.id,
    ),
  };
  const conflict = findSeriesConflict(withoutCurrent, template, rule);
  if (conflict) {
    return unchanged(
      state,
      conflictMessage(conflict.title, conflict.startTime, conflict.endTime),
    );
  }

  return changed(
    {
      ...state,
      recurrenceRules: [...withoutCurrent.recurrenceRules, rule],
      recurringCommitments: [...withoutCurrent.recurringCommitments, template],
    },
    { id: template.id },
  );
}

export function saveOccurrenceOverrideTransition(
  state: RecurrenceState,
  recurringCommitmentId: string,
  date: string,
  input: { title: string; startTime: string; endTime: string; notes?: string },
  overrideId: string,
  createdAt: string,
): RecurrenceTransition {
  const template = state.recurringCommitments.find(
    (item) => item.id === recurringCommitmentId,
  );
  if (!template) return unchanged(state, "That series is no longer available.");
  const title = input.title.trim();
  const startTime = normalizeLocalTime(input.startTime);
  const endTime = normalizeLocalTime(input.endTime);
  if (!title) return unchanged(state, "Add a title for this occurrence.");
  if (!startTime || !endTime || !isValidTimeRange({ startTime, endTime })) {
    return unchanged(state, "End time must be after a valid start time.");
  }
  const conflict = findOccurrenceConflict(
    state,
    date,
    { startTime, endTime },
    recurringCommitmentId,
  );
  if (conflict) {
    return unchanged(
      state,
      conflictMessage(conflict.title, conflict.startTime, conflict.endTime),
    );
  }
  const existing = state.recurrenceOverrides.find(
    (item) =>
      item.recurringCommitmentId === recurringCommitmentId &&
      item.date === date,
  );
  const override: RecurringCommitmentOverride = {
    id: existing?.id ?? overrideId,
    recurringCommitmentId,
    date,
    kind: "edit",
    title,
    startTime,
    endTime,
    notes: input.notes?.trim() || undefined,
    createdAt: existing?.createdAt ?? createdAt,
  };
  return changed({
    ...state,
    recurrenceOverrides: [
      ...state.recurrenceOverrides.filter(
        (item) =>
          !(
            item.recurringCommitmentId === recurringCommitmentId &&
            item.date === date
          ),
      ),
      override,
    ],
  });
}

export function skipOccurrenceTransition(
  state: RecurrenceState,
  recurringCommitmentId: string,
  date: string,
  overrideId: string,
  createdAt: string,
): RecurrenceTransition {
  if (
    !state.recurringCommitments.some(
      (item) => item.id === recurringCommitmentId,
    )
  ) {
    return unchanged(state, "That series is no longer available.");
  }
  const existing = state.recurrenceOverrides.find(
    (item) =>
      item.recurringCommitmentId === recurringCommitmentId &&
      item.date === date,
  );
  const override: RecurringCommitmentOverride = {
    id: existing?.id ?? overrideId,
    recurringCommitmentId,
    date,
    kind: "skip",
    createdAt: existing?.createdAt ?? createdAt,
  };
  return changed({
    ...state,
    recurrenceOverrides: [
      ...state.recurrenceOverrides.filter(
        (item) =>
          !(
            item.recurringCommitmentId === recurringCommitmentId &&
            item.date === date
          ),
      ),
      override,
    ],
  });
}

export function clearOccurrenceOverrideTransition(
  state: RecurrenceState,
  recurringCommitmentId: string,
  date: string,
): RecurrenceTransition {
  if (
    !state.recurrenceOverrides.some(
      (item) =>
        item.recurringCommitmentId === recurringCommitmentId &&
        item.date === date,
    )
  ) {
    return unchanged(state, "This occurrence has no override.");
  }
  const nextState = {
    ...state,
    recurrenceOverrides: state.recurrenceOverrides.filter(
      (item) =>
        !(
          item.recurringCommitmentId === recurringCommitmentId &&
          item.date === date
        ),
    ),
  };
  const restored = getRecurringCommitmentOccurrences(
    date,
    nextState.recurrenceRules,
    nextState.recurringCommitments,
    nextState.recurrenceOverrides,
  ).find((item) => item.recurringCommitmentId === recurringCommitmentId);
  if (restored) {
    const conflict = findOccurrenceConflict(
      nextState,
      date,
      restored,
      recurringCommitmentId,
    );
    if (conflict) {
      return unchanged(
        state,
        conflictMessage(conflict.title, conflict.startTime, conflict.endTime),
      );
    }
  }
  return changed(nextState);
}

export function saveRoutineTransition(
  state: RecurrenceState,
  input: RoutineInput,
  routineId: string,
  ruleId: string,
  createdAt: string,
  effectiveDate: string,
): RecurrenceTransition {
  const title = input.title.trim();
  if (!title) return unchanged(state, "Add a title for this routine.");
  const patternError = validatePattern(input);
  if (patternError) return unchanged(state, patternError);
  if (!validEstimate(input.estimatedMinutes)) {
    return unchanged(state, "The estimate must be a positive whole number.");
  }
  const defaultTime = input.defaultTime?.trim()
    ? (normalizeLocalTime(input.defaultTime) ?? undefined)
    : undefined;
  if (input.defaultTime?.trim() && !defaultTime) {
    return unchanged(state, "Enter a default time like 7:00 AM or 19:00.");
  }
  const existing = state.routines.find((item) => item.id === routineId);
  const existingRule = state.recurrenceRules.find(
    (item) => item.id === existing?.recurrenceRuleId,
  );
  const rule = makeRule(
    input,
    existingRule?.id ?? ruleId,
    createdAt,
    existingRule,
    effectiveDate,
  );
  const routine: Routine = {
    id: routineId,
    title,
    recurrenceRuleId: rule.id,
    estimatedMinutes: input.estimatedMinutes,
    defaultTime,
    domain: input.domain,
    enabled: input.enabled,
    createdAt: existing?.createdAt ?? createdAt,
    disabledFromDate: input.enabled
      ? undefined
      : (existing?.disabledFromDate ?? effectiveDate),
  };
  return changed(
    {
      ...state,
      recurrenceRules: [
        ...state.recurrenceRules.filter((item) => item.id !== rule.id),
        rule,
      ],
      routines: [
        ...state.routines.filter((item) => item.id !== routine.id),
        routine,
      ],
    },
    { id: routine.id },
  );
}

function upsertRoutineState(
  states: RoutineOccurrenceState[],
  next: RoutineOccurrenceState,
) {
  return [
    ...states.filter(
      (item) => !(item.routineId === next.routineId && item.date === next.date),
    ),
    next,
  ];
}

export function setRoutineOccurrenceStatusTransition(
  state: RecurrenceState,
  routineId: string,
  date: string,
  status: "pending" | "completed" | "skipped",
  updatedAt: string,
): RecurrenceTransition {
  const occurrence = getRoutineOccurrences(
    date,
    state.recurrenceRules,
    state.routines,
    state.routineStates,
  ).find((item) => item.routine.id === routineId);
  if (!occurrence) return unchanged(state, "That routine is not active today.");
  const linkedTask = occurrence.linkedTaskId
    ? state.tasks.find((item) => item.id === occurrence.linkedTaskId)
    : undefined;
  if (status === "skipped" && linkedTask && linkedTask.status !== "completed") {
    return unchanged(
      state,
      "Remove or complete the linked Today task before skipping this routine.",
    );
  }
  let tasks = state.tasks;
  if (
    status === "completed" &&
    linkedTask &&
    linkedTask.status !== "completed"
  ) {
    const completion = markTaskComplete(tasks, linkedTask.id, updatedAt);
    tasks = completion.tasks;
  }
  if (status === "pending" && !occurrence.linkedTaskId) {
    return changed({
      ...state,
      routineStates: state.routineStates.filter(
        (item) => !(item.routineId === routineId && item.date === date),
      ),
    });
  }
  return changed({
    ...state,
    tasks,
    routineStates: upsertRoutineState(state.routineStates, {
      id: routineOccurrenceId(routineId, date),
      routineId,
      date,
      status,
      linkedTaskId: occurrence.linkedTaskId,
      updatedAt,
    }),
  });
}

export function addRoutineOccurrenceToTodayTransition(
  state: RecurrenceState,
  routineId: string,
  date: string,
  priority: TaskPriority,
  taskId: string,
  createdAt: string,
): RecurrenceTransition {
  const occurrence = getRoutineOccurrences(
    date,
    state.recurrenceRules,
    state.routines,
    state.routineStates,
  ).find((item) => item.routine.id === routineId);
  if (!occurrence) return unchanged(state, "That routine is not active today.");
  if (occurrence.status !== "pending") {
    return unchanged(state, "Only a pending routine can be added to Today.");
  }
  const existingTask = state.tasks.find(
    (item) =>
      item.sourceRoutineId === routineId &&
      item.sourceRoutineDate === date &&
      item.status !== "completed",
  );
  if (existingTask) {
    const today = addTaskToToday(state.tasks, existingTask.id, priority);
    if (!today.ok) return unchanged(state, today.message ?? "Not added.");
    return changed(
      { ...state, tasks: today.tasks },
      { taskId: existingTask.id },
    );
  }

  const task: Task = {
    id: taskId,
    title: occurrence.routine.title,
    notes: "From your weekly rhythm",
    createdAt,
    status: "inbox",
    priority,
    today: false,
    now: false,
    estimatedMinutes: occurrence.routine.estimatedMinutes,
    sourceRoutineId: routineId,
    sourceRoutineDate: date,
  };
  const today = addTaskToToday([task, ...state.tasks], task.id, priority);
  if (!today.ok) return unchanged(state, today.message ?? "Not added.");
  return changed(
    {
      ...state,
      tasks: today.tasks,
      routineStates: upsertRoutineState(state.routineStates, {
        id: routineOccurrenceId(routineId, date),
        routineId,
        date,
        status: "pending",
        linkedTaskId: task.id,
        updatedAt: createdAt,
      }),
    },
    { taskId: task.id },
  );
}

export function syncRoutineTaskCompletion(
  routineStates: RoutineOccurrenceState[],
  task: Task | undefined,
  completedAt: string,
): RoutineOccurrenceState[] {
  if (!task?.sourceRoutineId || !task.sourceRoutineDate) return routineStates;
  return upsertRoutineState(routineStates, {
    id: routineOccurrenceId(task.sourceRoutineId, task.sourceRoutineDate),
    routineId: task.sourceRoutineId,
    date: task.sourceRoutineDate,
    status: "completed",
    linkedTaskId: task.id,
    updatedAt: completedAt,
  });
}
