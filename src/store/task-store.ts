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
  addChildSteps,
  completeProjectOutcome,
  completeStepAndLinkedTask,
  completeTaskAndLinkedStep,
  designateNextAction,
  sendNextActionToToday,
  updateProjectStatus,
} from "@/store/project-transitions";
import type {
  CreateProjectInput,
  Project,
  ProjectActionResult,
  ProjectStatus,
  ProjectStep,
} from "@/types/project";
import type {
  CaptureTaskInput,
  Task,
  TaskActionResult,
  TaskPriority,
} from "@/types/task";

interface TaskStore {
  tasks: Task[];
  projects: Project[];
  projectSteps: ProjectStep[];
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  captureTask: (input: CaptureTaskInput) => Task | null;
  addToToday: (taskId: string, priority: TaskPriority) => TaskActionResult;
  setNow: (taskId: string) => TaskActionResult;
  completeTask: (taskId: string) => TaskActionResult;
  removeFromToday: (taskId: string) => TaskActionResult;
  changePriority: (taskId: string, priority: TaskPriority) => TaskActionResult;
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

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      projects: [],
      projectSteps: [],
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
        const transition = completeTaskAndLinkedStep(
          projectData(get()),
          taskId,
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
      removeFromToday: (taskId) => {
        const transition = returnTaskToInbox(get().tasks, taskId);
        if (transition.ok) set({ tasks: transition.tasks });
        return transition;
      },
      changePriority: (taskId, priority) => {
        const transition = updateTaskPriority(get().tasks, taskId, priority);
        if (transition.ok) set({ tasks: transition.tasks });
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
      version: 1,
      migrate: (persistedState) => migratePersistedState(persistedState),
      partialize: ({ tasks, projects, projectSteps }) => ({
        tasks,
        projects,
        projectSteps,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
