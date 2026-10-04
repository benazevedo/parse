import type { Project, ProjectStep } from "../types/project";
import type { DayPlan } from "../types/planning";
import type { Task } from "../types/task";
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
  };
}
