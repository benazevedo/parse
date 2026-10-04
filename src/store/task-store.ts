import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  addTaskToToday,
  returnTaskToInbox,
  selectNowTask,
  updateTaskPriority,
} from "@/store/task-transitions";
import { migratePersistedState } from "@/store/persistence";
import {
  deleteCommitmentTransition,
  removeTaskBlockForDate,
  saveCommitmentTransition,
  scheduleTaskTransition,
  unscheduleTaskTransition,
  updateTaskEstimateTransition,
} from "@/store/planning-transitions";
import {
  addChildSteps,
  completeProjectOutcome,
  completeStepAndLinkedTask,
  completeTaskAndLinkedStep,
  designateNextAction,
  sendNextActionToToday,
  updateProjectStatus,
} from "@/store/project-transitions";
import {
  addRoutineOccurrenceToTodayTransition,
  clearOccurrenceOverrideTransition,
  saveOccurrenceOverrideTransition,
  saveRecurringCommitmentTransition,
  saveRoutineTransition,
  setRoutineOccurrenceStatusTransition,
  skipOccurrenceTransition,
  syncRoutineTaskCompletion,
} from "@/store/recurrence-transitions";
import type {
  CreateProjectInput,
  Project,
  ProjectActionResult,
  ProjectStatus,
  ProjectStep,
} from "@/types/project";
import type {
  CommitmentInput,
  DayPlan,
  PlanningActionResult,
  TaskScheduleInput,
} from "@/types/planning";
import type {
  CaptureTaskInput,
  Task,
  TaskActionResult,
  TaskPriority,
} from "@/types/task";
import type {
  RecurrenceActionResult,
  RecurrenceRule,
  RecurringCommitment,
  RecurringCommitmentInput,
  RecurringCommitmentOverride,
  Routine,
  RoutineInput,
  RoutineOccurrenceState,
  RoutineOccurrenceStatus,
} from "@/types/recurrence";
import { getLocalDateKey } from "@/utils/time";

interface TaskStore {
  tasks: Task[];
  projects: Project[];
  projectSteps: ProjectStep[];
  dayPlans: DayPlan[];
  recurrenceRules: RecurrenceRule[];
  recurringCommitments: RecurringCommitment[];
  recurrenceOverrides: RecurringCommitmentOverride[];
  routines: Routine[];
  routineStates: RoutineOccurrenceState[];
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  captureTask: (input: CaptureTaskInput) => Task | null;
  addToToday: (taskId: string, priority: TaskPriority) => TaskActionResult;
  setNow: (taskId: string) => TaskActionResult;
  completeTask: (taskId: string) => TaskActionResult;
  removeFromToday: (taskId: string) => TaskActionResult;
  changePriority: (taskId: string, priority: TaskPriority) => TaskActionResult;
  setTaskEstimate: (
    taskId: string,
    estimatedMinutes?: number,
  ) => PlanningActionResult;
  saveCommitment: (
    input: CommitmentInput,
    commitmentId?: string,
  ) => PlanningActionResult;
  deleteCommitment: (
    date: string,
    commitmentId: string,
  ) => PlanningActionResult;
  scheduleTask: (input: TaskScheduleInput) => PlanningActionResult;
  unscheduleTask: (date: string, taskId: string) => PlanningActionResult;
  saveRecurringCommitment: (
    input: RecurringCommitmentInput,
    templateId?: string,
  ) => RecurrenceActionResult;
  saveOccurrenceOverride: (
    recurringCommitmentId: string,
    date: string,
    input: {
      title: string;
      startTime: string;
      endTime: string;
      notes?: string;
    },
  ) => RecurrenceActionResult;
  skipOccurrence: (
    recurringCommitmentId: string,
    date: string,
  ) => RecurrenceActionResult;
  clearOccurrenceOverride: (
    recurringCommitmentId: string,
    date: string,
  ) => RecurrenceActionResult;
  saveRoutine: (
    input: RoutineInput,
    routineId?: string,
  ) => RecurrenceActionResult;
  setRoutineOccurrenceStatus: (
    routineId: string,
    date: string,
    status: RoutineOccurrenceStatus,
  ) => RecurrenceActionResult;
  addRoutineOccurrenceToToday: (
    routineId: string,
    date: string,
    priority: TaskPriority,
  ) => RecurrenceActionResult;
  createProject: (input: CreateProjectInput) => Project | null;
  addProjectSteps: (
    projectId: string,
    parentStepId: string | undefined,
    titles: string[],
  ) => ProjectActionResult;
  setProjectNextAction: (
    projectId: string,
    stepId: string,
  ) => ProjectActionResult;
  addProjectNextActionToToday: (
    projectId: string,
    priority: TaskPriority,
  ) => ProjectActionResult;
  completeProjectStep: (
    projectId: string,
    stepId: string,
  ) => ProjectActionResult;
  setProjectStatus: (
    projectId: string,
    status: Exclude<ProjectStatus, "completed">,
  ) => ProjectActionResult;
  completeProject: (projectId: string) => ProjectActionResult;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function projectData(state: TaskStore) {
  return {
    tasks: state.tasks,
    projects: state.projects,
    projectSteps: state.projectSteps,
  };
}

function planningData(state: TaskStore) {
  return {
    tasks: state.tasks,
    dayPlans: state.dayPlans,
    recurrenceRules: state.recurrenceRules,
    recurringCommitments: state.recurringCommitments,
    recurrenceOverrides: state.recurrenceOverrides,
  };
}

function recurrenceData(state: TaskStore) {
  return {
    tasks: state.tasks,
    dayPlans: state.dayPlans,
    recurrenceRules: state.recurrenceRules,
    recurringCommitments: state.recurringCommitments,
    recurrenceOverrides: state.recurrenceOverrides,
    routines: state.routines,
    routineStates: state.routineStates,
  };
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      projects: [],
      projectSteps: [],
      dayPlans: [],
      recurrenceRules: [],
      recurringCommitments: [],
      recurrenceOverrides: [],
      routines: [],
      routineStates: [],
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      captureTask: ({ title, notes }) => {
        const cleanTitle = title.trim();
        const cleanNotes = notes?.trim();

        if (!cleanTitle) {
          return null;
        }

        const task: Task = {
          id: createId("task"),
          title: cleanTitle,
          notes: cleanNotes || undefined,
          createdAt: new Date().toISOString(),
          status: "inbox",
          priority: "should",
          today: false,
          now: false,
        };

        set((state) => ({ tasks: [task, ...state.tasks] }));
        return task;
      },
      addToToday: (taskId, priority) => {
        const transition = addTaskToToday(get().tasks, taskId, priority);
        if (transition.ok) set({ tasks: transition.tasks });
        return transition;
      },
      setNow: (taskId) => {
        const transition = selectNowTask(get().tasks, taskId);
        if (transition.ok) set({ tasks: transition.tasks });
        return transition;
      },
      completeTask: (taskId) => {
        const completingTask = get().tasks.find((item) => item.id === taskId);
        const completedAt = new Date().toISOString();
        const transition = completeTaskAndLinkedStep(
          projectData(get()),
          taskId,
          completedAt,
        );
        if (transition.ok) {
          set({
            tasks: transition.tasks,
            projects: transition.projects,
            projectSteps: transition.projectSteps,
            routineStates: syncRoutineTaskCompletion(
              get().routineStates,
              completingTask,
              completedAt,
            ),
          });
        }
        return transition;
      },
      removeFromToday: (taskId) => {
        const transition = returnTaskToInbox(get().tasks, taskId);
        if (transition.ok) {
          set({
            tasks: transition.tasks,
            dayPlans: removeTaskBlockForDate(
              get().dayPlans,
              taskId,
              getLocalDateKey(),
            ),
          });
        }
        return transition;
      },
      changePriority: (taskId, priority) => {
        const transition = updateTaskPriority(get().tasks, taskId, priority);
        if (transition.ok) set({ tasks: transition.tasks });
        return transition;
      },
      setTaskEstimate: (taskId, estimatedMinutes) => {
        const transition = updateTaskEstimateTransition(
          get().tasks,
          taskId,
          estimatedMinutes,
        );
        if (transition.ok) set({ tasks: transition.tasks });
        return transition;
      },
      saveCommitment: (input, commitmentId = createId("commitment")) => {
        const transition = saveCommitmentTransition(
          planningData(get()),
          input,
          commitmentId,
          new Date().toISOString(),
        );
        if (transition.ok) set({ dayPlans: transition.dayPlans });
        return transition;
      },
      deleteCommitment: (date, commitmentId) => {
        const transition = deleteCommitmentTransition(
          planningData(get()),
          date,
          commitmentId,
        );
        if (transition.ok) set({ dayPlans: transition.dayPlans });
        return transition;
      },
      scheduleTask: (input) => {
        const transition = scheduleTaskTransition(
          planningData(get()),
          input,
          createId("block"),
        );
        if (transition.ok) {
          set({ tasks: transition.tasks, dayPlans: transition.dayPlans });
        }
        return transition;
      },
      unscheduleTask: (date, taskId) => {
        const transition = unscheduleTaskTransition(
          planningData(get()),
          date,
          taskId,
        );
        if (transition.ok) set({ dayPlans: transition.dayPlans });
        return transition;
      },
      saveRecurringCommitment: (input, templateId) => {
        const existing = templateId
          ? get().recurringCommitments.find((item) => item.id === templateId)
          : undefined;
        const transition = saveRecurringCommitmentTransition(
          recurrenceData(get()),
          input,
          existing?.id ?? createId("recurring-commitment"),
          existing?.recurrenceRuleId ?? createId("recurrence-rule"),
          new Date().toISOString(),
          getLocalDateKey(),
        );
        if (transition.ok) {
          set({
            recurrenceRules: transition.recurrenceRules,
            recurringCommitments: transition.recurringCommitments,
          });
        }
        return transition;
      },
      saveOccurrenceOverride: (recurringCommitmentId, date, input) => {
        const transition = saveOccurrenceOverrideTransition(
          recurrenceData(get()),
          recurringCommitmentId,
          date,
          input,
          createId("recurrence-override"),
          new Date().toISOString(),
        );
        if (transition.ok) {
          set({ recurrenceOverrides: transition.recurrenceOverrides });
        }
        return transition;
      },
      skipOccurrence: (recurringCommitmentId, date) => {
        const transition = skipOccurrenceTransition(
          recurrenceData(get()),
          recurringCommitmentId,
          date,
          createId("recurrence-override"),
          new Date().toISOString(),
        );
        if (transition.ok) {
          set({ recurrenceOverrides: transition.recurrenceOverrides });
        }
        return transition;
      },
      clearOccurrenceOverride: (recurringCommitmentId, date) => {
        const transition = clearOccurrenceOverrideTransition(
          recurrenceData(get()),
          recurringCommitmentId,
          date,
        );
        if (transition.ok) {
          set({ recurrenceOverrides: transition.recurrenceOverrides });
        }
        return transition;
      },
      saveRoutine: (input, routineId) => {
        const existing = routineId
          ? get().routines.find((item) => item.id === routineId)
          : undefined;
        const transition = saveRoutineTransition(
          recurrenceData(get()),
          input,
          existing?.id ?? createId("routine"),
          existing?.recurrenceRuleId ?? createId("recurrence-rule"),
          new Date().toISOString(),
          getLocalDateKey(),
        );
        if (transition.ok) {
          set({
            recurrenceRules: transition.recurrenceRules,
            routines: transition.routines,
          });
        }
        return transition;
      },
      setRoutineOccurrenceStatus: (routineId, date, status) => {
        const transition = setRoutineOccurrenceStatusTransition(
          recurrenceData(get()),
          routineId,
          date,
          status,
          new Date().toISOString(),
        );
        if (transition.ok) {
          set({
            tasks: transition.tasks,
            routineStates: transition.routineStates,
          });
        }
        return transition;
      },
      addRoutineOccurrenceToToday: (routineId, date, priority) => {
        const transition = addRoutineOccurrenceToTodayTransition(
          recurrenceData(get()),
          routineId,
          date,
          priority,
          createId("task"),
          new Date().toISOString(),
        );
        if (transition.ok) {
          set({
            tasks: transition.tasks,
            routineStates: transition.routineStates,
          });
        }
        return transition;
      },
      createProject: ({ title, desiredOutcome, status = "active" }) => {
        const cleanTitle = title.trim();
        const cleanOutcome = desiredOutcome.trim();
        if (!cleanTitle || !cleanOutcome) return null;

        const timestamp = new Date().toISOString();
        const project: Project = {
          id: createId("project"),
          title: cleanTitle,
          desiredOutcome: cleanOutcome,
          createdAt: timestamp,
          updatedAt: timestamp,
          status,
        };
        set((state) => ({ projects: [project, ...state.projects] }));
        return project;
      },
      addProjectSteps: (projectId, parentStepId, titles) => {
        const cleanTitles = titles.map((title) => title.trim()).filter(Boolean);
        const transition = addChildSteps(
          projectData(get()),
          projectId,
          parentStepId,
          cleanTitles,
          cleanTitles.map(() => createId("step")),
          new Date().toISOString(),
        );
        if (transition.ok) {
          set({
            projects: transition.projects,
            projectSteps: transition.projectSteps,
          });
        }
        return transition;
      },
      setProjectNextAction: (projectId, stepId) => {
        const transition = designateNextAction(
          projectData(get()),
          projectId,
          stepId,
          new Date().toISOString(),
        );
        if (transition.ok) set({ projects: transition.projects });
        return transition;
      },
      addProjectNextActionToToday: (projectId, priority) => {
        const transition = sendNextActionToToday(
          projectData(get()),
          projectId,
          priority,
          createId("task"),
          new Date().toISOString(),
        );
        if (transition.ok) set({ tasks: transition.tasks });
        return transition;
      },
      completeProjectStep: (projectId, stepId) => {
        const transition = completeStepAndLinkedTask(
          projectData(get()),
          projectId,
          stepId,
          new Date().toISOString(),
        );
        if (transition.ok) {
          set({
            tasks: transition.tasks,
            projects: transition.projects,
            projectSteps: transition.projectSteps,
          });
        }
        return transition;
      },
      setProjectStatus: (projectId, status) => {
        const transition = updateProjectStatus(
          projectData(get()),
          projectId,
          status,
          new Date().toISOString(),
        );
        if (transition.ok) set({ projects: transition.projects });
        return transition;
      },
      completeProject: (projectId) => {
        const transition = completeProjectOutcome(
          projectData(get()),
          projectId,
          new Date().toISOString(),
        );
        if (transition.ok) {
          set({
            tasks: transition.tasks,
            projects: transition.projects,
            projectSteps: transition.projectSteps,
          });
        }
        return transition;
      },
    }),
    {
      name: "parse-tasks-v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persistedState) => migratePersistedState(persistedState),
      partialize: ({
        tasks,
        projects,
        projectSteps,
        dayPlans,
        recurrenceRules,
        recurringCommitments,
        recurrenceOverrides,
        routines,
        routineStates,
      }) => ({
        tasks,
        projects,
        projectSteps,
        dayPlans,
        recurrenceRules,
        recurringCommitments,
        recurrenceOverrides,
        routines,
        routineStates,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
