import type { Project, ProjectStep } from "../types/project";
import type { Task } from "../types/task";

export interface PersistedAppState {
  tasks: Task[];
  projects: Project[];
  projectSteps: ProjectStep[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function migratePersistedState(
  persistedState: unknown,
): PersistedAppState {
  if (!isRecord(persistedState)) {
    return { tasks: [], projects: [], projectSteps: [] };
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
  };
}
