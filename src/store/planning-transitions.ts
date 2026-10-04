import type {
  CommitmentInput,
  DayPlan,
  FixedCommitment,
  PlanningActionResult,
  TaskScheduleInput,
  TaskTimeBlock,
} from "../types/planning";
import type { Task } from "../types/task";
import type {
  RecurrenceRule,
  RecurringCommitment,
  RecurringCommitmentOverride,
} from "../types/recurrence";
import { getRecurringCommitmentOccurrences } from "../utils/recurrence";
import {
  formatLocalTime,
  isValidTimeRange,
  normalizeLocalTime,
  rangesOverlap,
} from "../utils/time";

export interface PlanningState {
  tasks: Task[];
  dayPlans: DayPlan[];
  recurrenceRules?: RecurrenceRule[];
  recurringCommitments?: RecurringCommitment[];
  recurrenceOverrides?: RecurringCommitmentOverride[];
}

export interface PlanningTransition
  extends PlanningActionResult, PlanningState {}

function unchanged(state: PlanningState, message: string): PlanningTransition {
  return { ...state, ok: false, message };
}

function changed(
  state: PlanningState,
  result: Omit<PlanningActionResult, "ok"> = {},
): PlanningTransition {
  return { ...state, ...result, ok: true };
}

function validEstimate(value?: number): boolean {
  return value === undefined || (Number.isInteger(value) && value > 0);
}

function withPlan(
  dayPlans: DayPlan[],
  date: string,
  update: (plan: DayPlan) => DayPlan,
): DayPlan[] {
  const existing = dayPlans.find((plan) => plan.date === date);
  if (!existing) {
    return [...dayPlans, update({ date, commitments: [], timeBlocks: [] })];
  }
  return dayPlans.map((plan) => (plan.date === date ? update(plan) : plan));
}

function getActiveBlocks(plan: DayPlan, tasks: Task[]): TaskTimeBlock[] {
  return plan.timeBlocks.filter((block) => {
    const task = tasks.find((item) => item.id === block.taskId);
    return Boolean(task && task.today && task.status !== "completed");
  });
}

function conflictMessage(title: string, startTime: string, endTime: string) {
  return `${title} already occupies ${formatLocalTime(startTime)}–${formatLocalTime(endTime)}.`;
}

function recurringCommitmentsForDate(state: PlanningState, date: string) {
  return getRecurringCommitmentOccurrences(
    date,
    state.recurrenceRules ?? [],
    state.recurringCommitments ?? [],
    state.recurrenceOverrides ?? [],
  );
}

export function saveCommitmentTransition(
  state: PlanningState,
  input: CommitmentInput,
  commitmentId: string,
  createdAt: string,
): PlanningTransition {
  const title = input.title.trim();
  const notes = input.notes?.trim();
  const startTime = normalizeLocalTime(input.startTime);
  const endTime = normalizeLocalTime(input.endTime);
  if (!title) return unchanged(state, "Add a title for this commitment.");
  if (!startTime || !endTime) {
    return unchanged(state, "Enter times like 6:00 AM or 18:00.");
  }
  if (!isValidTimeRange({ startTime, endTime })) {
    return unchanged(state, "End time must be after start time.");
  }

  const plan = state.dayPlans.find((item) => item.date === input.date);
  const recurringConflict = recurringCommitmentsForDate(state, input.date).find(
    (item) => rangesOverlap({ startTime, endTime }, item),
  );
  if (recurringConflict) {
    return unchanged(
      state,
      conflictMessage(
        recurringConflict.title,
        recurringConflict.startTime,
        recurringConflict.endTime,
      ),
    );
  }
  const commitmentConflict = plan?.commitments.find(
    (item) =>
      item.id !== commitmentId && rangesOverlap({ startTime, endTime }, item),
  );
  if (commitmentConflict) {
    return unchanged(
      state,
      conflictMessage(
        commitmentConflict.title,
        commitmentConflict.startTime,
        commitmentConflict.endTime,
      ),
    );
  }
  const blockConflict = plan
    ? getActiveBlocks(plan, state.tasks).find((item) =>
        rangesOverlap({ startTime, endTime }, item),
      )
    : undefined;
  if (blockConflict) {
    const task = state.tasks.find((item) => item.id === blockConflict.taskId);
    return unchanged(
      state,
      conflictMessage(
        task?.title ?? "A scheduled task",
        blockConflict.startTime,
        blockConflict.endTime,
      ),
    );
  }

  const existing = plan?.commitments.find((item) => item.id === commitmentId);
  const commitment: FixedCommitment = {
    id: commitmentId,
    date: input.date,
    title,
    startTime,
    endTime,
    notes: notes || undefined,
    createdAt: existing?.createdAt ?? createdAt,
  };
  return changed(
    {
      ...state,
      dayPlans: withPlan(state.dayPlans, input.date, (dayPlan) => ({
        ...dayPlan,
        commitments: existing
          ? dayPlan.commitments.map((item) =>
              item.id === commitmentId ? commitment : item,
            )
          : [...dayPlan.commitments, commitment],
      })),
    },
    { id: commitmentId },
  );
}

export function deleteCommitmentTransition(
  state: PlanningState,
  date: string,
  commitmentId: string,
): PlanningTransition {
  const plan = state.dayPlans.find((item) => item.date === date);
  if (!plan?.commitments.some((item) => item.id === commitmentId)) {
    return unchanged(state, "That commitment is no longer available.");
  }
  return changed({
    ...state,
    dayPlans: withPlan(state.dayPlans, date, (dayPlan) => ({
      ...dayPlan,
      commitments: dayPlan.commitments.filter(
        (item) => item.id !== commitmentId,
      ),
    })),
  });
}

export function scheduleTaskTransition(
  state: PlanningState,
  input: TaskScheduleInput,
  blockId: string,
): PlanningTransition {
  const task = state.tasks.find((item) => item.id === input.taskId);
  if (!task) return unchanged(state, "That task is no longer available.");
  if (task.status === "completed") {
    return unchanged(state, "Completed tasks cannot be scheduled.");
  }
  if (!task.today) {
    return unchanged(state, "Only an incomplete Today task can be scheduled.");
  }
  if (!validEstimate(input.estimatedMinutes)) {
    return unchanged(state, "The estimate must be a positive whole number.");
  }

  const startTime = normalizeLocalTime(input.startTime);
  const endTime = normalizeLocalTime(input.endTime);
  if (!startTime || !endTime) {
    return unchanged(state, "Enter times like 6:15 PM or 18:15.");
  }
  if (!isValidTimeRange({ startTime, endTime })) {
    return unchanged(state, "End time must be after start time.");
  }

  const plan = state.dayPlans.find((item) => item.date === input.date);
  const recurringConflict = recurringCommitmentsForDate(state, input.date).find(
    (item) => rangesOverlap({ startTime, endTime }, item),
  );
  if (recurringConflict) {
    return unchanged(
      state,
      conflictMessage(
        recurringConflict.title,
        recurringConflict.startTime,
        recurringConflict.endTime,
      ),
    );
  }
  const commitmentConflict = plan?.commitments.find((item) =>
    rangesOverlap({ startTime, endTime }, item),
  );
  if (commitmentConflict) {
    return unchanged(
      state,
      conflictMessage(
        commitmentConflict.title,
        commitmentConflict.startTime,
        commitmentConflict.endTime,
      ),
    );
  }
  const existing = plan?.timeBlocks.find(
    (item) => item.taskId === input.taskId,
  );
  const blockConflict = plan
    ? getActiveBlocks(plan, state.tasks).find(
        (item) =>
          item.id !== existing?.id &&
          rangesOverlap({ startTime, endTime }, item),
      )
    : undefined;
  if (blockConflict) {
    const conflictTask = state.tasks.find(
      (item) => item.id === blockConflict.taskId,
    );
    return unchanged(
      state,
      conflictMessage(
        conflictTask?.title ?? "Another scheduled task",
        blockConflict.startTime,
        blockConflict.endTime,
      ),
    );
  }

  const block: TaskTimeBlock = {
    id: existing?.id ?? blockId,
    date: input.date,
    taskId: input.taskId,
    startTime,
    endTime,
  };
  return changed(
    {
      tasks: state.tasks.map((item) =>
        item.id === input.taskId
          ? { ...item, estimatedMinutes: input.estimatedMinutes }
          : item,
      ),
      dayPlans: withPlan(state.dayPlans, input.date, (dayPlan) => ({
        ...dayPlan,
        timeBlocks: [
          ...dayPlan.timeBlocks.filter((item) => item.taskId !== input.taskId),
          block,
        ],
      })),
    },
    { id: block.id },
  );
}

export function unscheduleTaskTransition(
  state: PlanningState,
  date: string,
  taskId: string,
): PlanningTransition {
  const plan = state.dayPlans.find((item) => item.date === date);
  if (!plan?.timeBlocks.some((item) => item.taskId === taskId)) {
    return unchanged(state, "That task is not scheduled for this day.");
  }
  return changed({
    ...state,
    dayPlans: withPlan(state.dayPlans, date, (dayPlan) => ({
      ...dayPlan,
      timeBlocks: dayPlan.timeBlocks.filter((item) => item.taskId !== taskId),
    })),
  });
}

export function updateTaskEstimateTransition(
  tasks: Task[],
  taskId: string,
  estimatedMinutes?: number,
): { tasks: Task[] } & PlanningActionResult {
  const task = tasks.find((item) => item.id === taskId);
  if (!task)
    return { tasks, ok: false, message: "That task is no longer available." };
  if (task.status === "completed") {
    return { tasks, ok: false, message: "Completed tasks cannot be edited." };
  }
  if (!validEstimate(estimatedMinutes)) {
    return {
      tasks,
      ok: false,
      message: "The estimate must be a positive whole number.",
    };
  }
  return {
    ok: true,
    tasks: tasks.map((item) =>
      item.id === taskId ? { ...item, estimatedMinutes } : item,
    ),
  };
}

export function removeTaskBlockForDate(
  dayPlans: DayPlan[],
  taskId: string,
  date: string,
): DayPlan[] {
  if (!dayPlans.some((plan) => plan.date === date)) return dayPlans;
  return withPlan(dayPlans, date, (dayPlan) => ({
    ...dayPlan,
    timeBlocks: dayPlan.timeBlocks.filter((item) => item.taskId !== taskId),
  }));
}
