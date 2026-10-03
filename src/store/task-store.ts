import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  addTaskToToday,
  markTaskComplete,
  returnTaskToInbox,
  selectNowTask,
  updateTaskPriority,
} from "@/store/task-transitions";
import type {
  CaptureTaskInput,
  Task,
  TaskActionResult,
  TaskPriority,
} from "@/types/task";

interface TaskStore {
  tasks: Task[];
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  captureTask: (input: CaptureTaskInput) => Task | null;
  addToToday: (taskId: string, priority: TaskPriority) => TaskActionResult;
  setNow: (taskId: string) => TaskActionResult;
  completeTask: (taskId: string) => TaskActionResult;
  removeFromToday: (taskId: string) => TaskActionResult;
  changePriority: (taskId: string, priority: TaskPriority) => TaskActionResult;
}

function createTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      captureTask: ({ title, notes }) => {
        const cleanTitle = title.trim();
        const cleanNotes = notes?.trim();

        if (!cleanTitle) {
          return null;
        }

        const task: Task = {
          id: createTaskId(),
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
        const transition = markTaskComplete(
          get().tasks,
          taskId,
          new Date().toISOString(),
        );
        if (transition.ok) set({ tasks: transition.tasks });
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
    }),
    {
      name: "parse-tasks-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ tasks }) => ({ tasks }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
