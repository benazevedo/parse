import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  archiveCaptureItem,
  createCaptureItem,
  processCaptureAsKnowledge,
  processCaptureAsProject,
  processCaptureAsTask,
  restoreArchivedCaptureItem,
  setKnowledgeItemArchived,
  undoCaptureProcessing,
  updateKnowledgeItem,
} from "@/store/capture-transitions";
import {
  completeWeeklyReview,
  createProjectWithFocus,
  parkAndActivateProject,
  saveActiveSlot,
  setProjectFocus,
  startWeeklyReview,
} from "@/store/focus-transitions";

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
} from "@/store/project-transitions";
import {
  DEFAULT_ACTIVE_SLOTS,
  type ActiveSlot,
  type FocusActionResult,
  type WeeklyReview,
} from "@/types/focus";
import type {
  CaptureActionResult,
  CaptureInput,
  CaptureItem,
  KnowledgeItem,
  ProcessCaptureKnowledgeInput,
  ProcessCaptureProjectInput,
  ProcessCaptureTaskInput,
  UpdateKnowledgeInput,
} from "@/types/capture";
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
import type { Task, TaskActionResult, TaskPriority } from "@/types/task";
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
  activeSlots: ActiveSlot[];
  weeklyReviews: WeeklyReview[];
  captureItems: CaptureItem[];
  knowledgeItems: KnowledgeItem[];
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  captureThought: (input: CaptureInput) => CaptureActionResult;
  processCaptureAsTask: (
    captureItemId: string,
    input: ProcessCaptureTaskInput,
  ) => CaptureActionResult;
  processCaptureAsProject: (
    captureItemId: string,
    input: ProcessCaptureProjectInput,
    projectIdsToPark?: string[],
  ) => CaptureActionResult;
  processCaptureAsKnowledge: (
    captureItemId: string,
    input: ProcessCaptureKnowledgeInput,
  ) => CaptureActionResult;
  archiveCapture: (captureItemId: string) => CaptureActionResult;
  restoreArchivedCapture: (captureItemId: string) => CaptureActionResult;
  undoCaptureProcessing: (captureItemId: string) => CaptureActionResult;
  updateKnowledgeItem: (
    knowledgeItemId: string,
    input: UpdateKnowledgeInput,
  ) => CaptureActionResult;
  setKnowledgeArchived: (
    knowledgeItemId: string,
    archived: boolean,
  ) => CaptureActionResult;
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
  createProject: (input: CreateProjectInput) => FocusActionResult;
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
    activeSlotId?: string,
  ) => FocusActionResult;
  parkAndActivateProject: (
    projectId: string,
    slotId: string,
    projectIdsToPark: string[],
  ) => FocusActionResult;
  saveActiveSlot: (slot: ActiveSlot) => FocusActionResult;
  startWeeklyReview: (date: string) => FocusActionResult;
  completeWeeklyReview: (reviewId: string, notes?: string) => FocusActionResult;
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

function focusData(state: TaskStore) {
  return {
    projects: state.projects,
    activeSlots: state.activeSlots,
    weeklyReviews: state.weeklyReviews,
  };
}

function captureData(state: TaskStore) {
  return {
    captureItems: state.captureItems,
    knowledgeItems: state.knowledgeItems,
    tasks: state.tasks,
    projects: state.projects,
    activeSlots: state.activeSlots,
    weeklyReviews: state.weeklyReviews,
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
      activeSlots: DEFAULT_ACTIVE_SLOTS.map((slot) => ({ ...slot })),
      weeklyReviews: [],
      captureItems: [],
      knowledgeItems: [],
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      captureThought: (input) => {
        const transition = createCaptureItem(
          captureData(get()),
          input,
          createId("capture"),
          new Date().toISOString(),
        );
        if (transition.ok) set({ captureItems: transition.captureItems });
        return transition;
      },
      processCaptureAsTask: (captureItemId, input) => {
        const transition = processCaptureAsTask(
          captureData(get()),
          captureItemId,
          input,
          createId("task"),
          new Date().toISOString(),
        );
        if (transition.ok) {
          set({
            captureItems: transition.captureItems,
            tasks: transition.tasks,
          });
        }
        return transition;
      },
      processCaptureAsProject: (
        captureItemId,
        input,
        projectIdsToPark = [],
      ) => {
        const transition = processCaptureAsProject(
          captureData(get()),
          captureItemId,
          input,
          createId("project"),
          new Date().toISOString(),
          projectIdsToPark,
        );
        if (transition.ok) {
          set({
            captureItems: transition.captureItems,
            projects: transition.projects,
            activeSlots: transition.activeSlots,
            weeklyReviews: transition.weeklyReviews,
          });
        }
        return transition;
      },
      processCaptureAsKnowledge: (captureItemId, input) => {
        const transition = processCaptureAsKnowledge(
          captureData(get()),
          captureItemId,
          input,
          createId("knowledge"),
          new Date().toISOString(),
        );
        if (transition.ok) {
          set({
            captureItems: transition.captureItems,
            knowledgeItems: transition.knowledgeItems,
          });
        }
        return transition;
      },
      archiveCapture: (captureItemId) => {
        const transition = archiveCaptureItem(
          captureData(get()),
          captureItemId,
          new Date().toISOString(),
        );
        if (transition.ok) set({ captureItems: transition.captureItems });
        return transition;
      },
      restoreArchivedCapture: (captureItemId) => {
        const transition = restoreArchivedCaptureItem(
          captureData(get()),
          captureItemId,
        );
        if (transition.ok) set({ captureItems: transition.captureItems });
        return transition;
      },
      undoCaptureProcessing: (captureItemId) => {
        const transition = undoCaptureProcessing(
          captureData(get()),
          captureItemId,
        );
        if (transition.ok) {
          set({
            captureItems: transition.captureItems,
            knowledgeItems: transition.knowledgeItems,
            tasks: transition.tasks,
            projects: transition.projects,
          });
        }
        return transition;
      },
      updateKnowledgeItem: (knowledgeItemId, input) => {
        const transition = updateKnowledgeItem(
          get().knowledgeItems,
          knowledgeItemId,
          input,
          new Date().toISOString(),
        );
        if (transition.ok) set({ knowledgeItems: transition.knowledgeItems });
        return transition;
      },
      setKnowledgeArchived: (knowledgeItemId, archived) => {
        const transition = setKnowledgeItemArchived(
          get().knowledgeItems,
          knowledgeItemId,
          archived,
          new Date().toISOString(),
        );
        if (transition.ok) set({ knowledgeItems: transition.knowledgeItems });
        return transition;
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
      createProject: (input) => {
        const transition = createProjectWithFocus(
          focusData(get()),
          input,
          createId("project"),
          new Date().toISOString(),
        );
        if (transition.ok) set({ projects: transition.projects });
        return transition;
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
      setProjectStatus: (projectId, status, activeSlotId) => {
        const transition = setProjectFocus(
          focusData(get()),
          projectId,
          status,
          activeSlotId,
          new Date().toISOString(),
        );
        if (transition.ok) set({ projects: transition.projects });
        return transition;
      },
      parkAndActivateProject: (projectId, slotId, projectIdsToPark) => {
        const transition = parkAndActivateProject(
          focusData(get()),
          projectId,
          slotId,
          projectIdsToPark,
          new Date().toISOString(),
        );
        if (transition.ok) set({ projects: transition.projects });
        return transition;
      },
      saveActiveSlot: (slot) => {
        const transition = saveActiveSlot(focusData(get()), slot);
        if (transition.ok) set({ activeSlots: transition.activeSlots });
        return transition;
      },
      startWeeklyReview: (date) => {
        const transition = startWeeklyReview(
          focusData(get()),
          createId("weekly-review"),
          date,
          new Date().toISOString(),
        );
        if (transition.ok) set({ weeklyReviews: transition.weeklyReviews });
        return transition;
      },
      completeWeeklyReview: (reviewId, notes) => {
        const transition = completeWeeklyReview(
          focusData(get()),
          reviewId,
          notes,
          new Date().toISOString(),
        );
        if (transition.ok) set({ weeklyReviews: transition.weeklyReviews });
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
      version: 5,
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
        activeSlots,
        weeklyReviews,
        captureItems,
        knowledgeItems,
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
        activeSlots,
        weeklyReviews,
        captureItems,
        knowledgeItems,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
