import type { Project, ProjectStep } from "../types/project";
import type { DayPlan } from "../types/planning";
import type { Task } from "../types/task";
import type { CaptureItem, KnowledgeItem } from "../types/capture";
import {
  DEFAULT_ACTIVE_SLOTS,
  type ActiveSlot,
  type WeeklyReview,
} from "../types/focus";
import type {
  RecurrenceRule,
  RecurringCommitment,
  RecurringCommitmentOverride,
  Routine,
  RoutineOccurrenceState,
} from "../types/recurrence";

export interface PersistedAppState {
  tasks: Task[];
  projects: Project[];
  projectSteps: ProjectStep[];
  dayPlans: DayPlan[];
  recurrenceRules: RecurrenceRule[];
  recurringCommitments: RecurringCommitment[];
  recurrenceOverrides: RecurringCommitmentOverride[];
  routines: Routine[];
  routineStates: RoutineOccurrenceState[];
  activeSlots: ActiveSlot[];
  weeklyReviews: WeeklyReview[];
  captureItems: CaptureItem[];
  knowledgeItems: KnowledgeItem[];
}

function defaultActiveSlots(): ActiveSlot[] {
  return DEFAULT_ACTIVE_SLOTS.map((slot) => ({ ...slot }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function migratePersistedState(
  persistedState: unknown,
): PersistedAppState {
  if (!isRecord(persistedState)) {
    return {
      tasks: [],
      projects: [],
      projectSteps: [],
      dayPlans: [],
      recurrenceRules: [],
      recurringCommitments: [],
      recurrenceOverrides: [],
      routines: [],
      routineStates: [],
      activeSlots: defaultActiveSlots(),
      weeklyReviews: [],
      captureItems: [],
      knowledgeItems: [],
    };
  }

  return {
    tasks: Array.isArray(persistedState.tasks)
      ? (persistedState.tasks as Task[])
      : [],
    projects: Array.isArray(persistedState.projects)
      ? (persistedState.projects as Project[])
      : [],
    projectSteps: Array.isArray(persistedState.projectSteps)
      ? (persistedState.projectSteps as ProjectStep[])
      : [],
    dayPlans: Array.isArray(persistedState.dayPlans)
      ? persistedState.dayPlans
          .filter(isRecord)
          .filter((plan) => typeof plan.date === "string")
          .map((plan): DayPlan => ({
            date: plan.date as string,
            commitments: Array.isArray(plan.commitments)
              ? (plan.commitments as DayPlan["commitments"])
              : [],
            timeBlocks: Array.isArray(plan.timeBlocks)
              ? (plan.timeBlocks as DayPlan["timeBlocks"])
              : [],
          }))
      : [],
    recurrenceRules: Array.isArray(persistedState.recurrenceRules)
      ? (persistedState.recurrenceRules as RecurrenceRule[])
      : [],
    recurringCommitments: Array.isArray(persistedState.recurringCommitments)
      ? (persistedState.recurringCommitments as RecurringCommitment[])
      : [],
    recurrenceOverrides: Array.isArray(persistedState.recurrenceOverrides)
      ? (persistedState.recurrenceOverrides as RecurringCommitmentOverride[])
      : [],
    routines: Array.isArray(persistedState.routines)
      ? (persistedState.routines as Routine[])
      : [],
    routineStates: Array.isArray(persistedState.routineStates)
      ? (persistedState.routineStates as RoutineOccurrenceState[])
      : [],
    activeSlots:
      Array.isArray(persistedState.activeSlots) &&
      persistedState.activeSlots.length > 0
        ? (persistedState.activeSlots as ActiveSlot[])
        : defaultActiveSlots(),
    weeklyReviews: Array.isArray(persistedState.weeklyReviews)
      ? (persistedState.weeklyReviews as WeeklyReview[])
      : [],
    captureItems: Array.isArray(persistedState.captureItems)
      ? (persistedState.captureItems as CaptureItem[])
      : [],
    knowledgeItems: Array.isArray(persistedState.knowledgeItems)
      ? (persistedState.knowledgeItems as KnowledgeItem[])
      : [],
  };
}
