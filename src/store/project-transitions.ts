import { addTaskToToday, markTaskComplete } from "./task-transitions";
import { isExecutableStep, projectOwnsStep } from "./project-rules";
import type {
  Project,
  ProjectActionResult,
  ProjectStatus,
  ProjectStep,
} from "../types/project";
import type { Task, TaskPriority } from "../types/task";

export interface ProjectDataState {
  tasks: Task[];
  projects: Project[];
  projectSteps: ProjectStep[];
}

export interface ProjectTransition
  extends ProjectActionResult, ProjectDataState {}

function unchanged(
  state: ProjectDataState,
  message: string,
): ProjectTransition {
  return { ...state, ok: false, message };
}

function changed(
  state: ProjectDataState,
  result: Omit<ProjectActionResult, "ok"> = {},
): ProjectTransition {
  return { ...state, ...result, ok: true };
}

export function addChildSteps(
  state: ProjectDataState,
  projectId: string,
  parentStepId: string | undefined,
  titles: string[],
  stepIds: string[],
  createdAt: string,
): ProjectTransition {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return unchanged(state, "That project is no longer available.");
  if (project.status === "completed") {
    return unchanged(state, "Completed projects cannot be parsed further.");
  }

  if (parentStepId) {
    const parent = state.projectSteps.find((step) => step.id === parentStepId);
    if (!projectOwnsStep(projectId, parent)) {
      return unchanged(
        state,
        "The selected parent does not belong to this project.",
      );
    }
    if (parent.status === "completed") {
      return unchanged(state, "Completed steps cannot be parsed further.");
    }
  }

  const cleanTitles = titles.map((title) => title.trim()).filter(Boolean);
  if (cleanTitles.length === 0) {
    return unchanged(state, "Add at least one smaller step.");
  }
  if (cleanTitles.length !== stepIds.length) {
    return unchanged(state, "The new steps could not be created safely.");
  }

  const siblingOrders = state.projectSteps
    .filter(
      (step) =>
        step.projectId === projectId && step.parentStepId === parentStepId,
    )
    .map((step) => step.order);
  const firstOrder = siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
  const newSteps: ProjectStep[] = cleanTitles.map((title, index) => ({
    id: stepIds[index],
    projectId,
    title,
    createdAt,
    status: "active",
    order: firstOrder + index,
    parentStepId,
  }));

  return changed(
    {
      ...state,
      projects: state.projects.map((item) =>
        item.id === projectId ? { ...item, updatedAt: createdAt } : item,
      ),
      projectSteps: [...state.projectSteps, ...newSteps],
    },
    { projectId, stepIds },
  );
}

export function designateNextAction(
  state: ProjectDataState,
  projectId: string,
  stepId: string,
  updatedAt: string,
): ProjectTransition {
  const project = state.projects.find((item) => item.id === projectId);
  const step = state.projectSteps.find((item) => item.id === stepId);

  if (!project) return unchanged(state, "That project is no longer available.");
  if (project.status === "completed") {
    return unchanged(state, "A completed project cannot have a Next Action.");
  }
  if (!projectOwnsStep(projectId, step)) {
    return unchanged(state, "A Next Action must belong to this project.");
  }
  if (!isExecutableStep(step, state.projectSteps)) {
    return unchanged(
      state,
      step.status === "completed"
        ? "A completed step cannot be the Next Action."
        : "Parse this outcome further or finish its child steps before making it the Next Action.",
    );
  }

  return changed({
    ...state,
    projects: state.projects.map((item) =>
      item.id === projectId
        ? { ...item, nextActionId: stepId, updatedAt }
        : item,
    ),
  });
}

export function sendNextActionToToday(
  state: ProjectDataState,
  projectId: string,
  priority: TaskPriority,
  taskId: string,
  createdAt: string,
): ProjectTransition {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return unchanged(state, "That project is no longer available.");
  if (project.status !== "active") {
    return unchanged(
      state,
      "Reactivate this project before sending work to Today.",
    );
  }
  if (!project.nextActionId) {
    return unchanged(state, "Choose an executable Next Action first.");
  }

  const step = state.projectSteps.find(
    (item) => item.id === project.nextActionId,
  );
  if (!projectOwnsStep(projectId, step)) {
    return unchanged(state, "The project's Next Action is no longer valid.");
  }
  if (!isExecutableStep(step, state.projectSteps)) {
    return unchanged(
      state,
      "Only an incomplete step without unfinished children can be sent to Today.",
    );
  }

  const existingTask = state.tasks.find(
    (task) =>
      task.sourceProjectStepId === step.id && task.status !== "completed",
  );
  if (existingTask) {
    return unchanged(
      state,
      existingTask.today
        ? "This Next Action is already in Today."
        : "This Next Action already has an active task.",
    );
  }

  const linkedTask: Task = {
    id: taskId,
    title: step.title,
    notes: `Next action for ${project.title}`,
    createdAt,
    status: "inbox",
    priority,
    today: false,
    now: false,
    sourceProjectId: projectId,
    sourceProjectStepId: step.id,
  };
  const taskTransition = addTaskToToday(
    [linkedTask, ...state.tasks],
    taskId,
    priority,
  );
  if (!taskTransition.ok) {
    return unchanged(
      state,
      taskTransition.message ?? "The Next Action could not be added to Today.",
    );
  }

  return changed(
    { ...state, tasks: taskTransition.tasks },
    { projectId, taskId },
  );
}

export function completeStepAndLinkedTask(
  state: ProjectDataState,
  projectId: string,
  stepId: string,
  completedAt: string,
): ProjectTransition {
  const project = state.projects.find((item) => item.id === projectId);
  const step = state.projectSteps.find((item) => item.id === stepId);

  if (!project) return unchanged(state, "That project is no longer available.");
  if (!projectOwnsStep(projectId, step)) {
    return unchanged(state, "That step does not belong to this project.");
  }
  if (!isExecutableStep(step, state.projectSteps)) {
    return unchanged(
      state,
      step.status === "completed"
        ? "This step is already complete."
        : "Complete the unfinished child steps before completing this outcome.",
    );
  }

  return changed({
    tasks: state.tasks.map((task) =>
      task.sourceProjectStepId === stepId && task.status !== "completed"
        ? {
            ...task,
            status: "completed",
            completedAt,
            today: false,
            now: false,
          }
        : task,
    ),
    projectSteps: state.projectSteps.map((item) =>
      item.id === stepId ? { ...item, status: "completed", completedAt } : item,
    ),
    projects: state.projects.map((item) =>
      item.id === projectId
        ? {
            ...item,
            nextActionId:
              item.nextActionId === stepId ? undefined : item.nextActionId,
            updatedAt: completedAt,
          }
        : item,
    ),
  });
}

export function completeTaskAndLinkedStep(
  state: ProjectDataState,
  taskId: string,
  completedAt: string,
): ProjectTransition {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return unchanged(state, "That item is no longer available.");

  const taskTransition = markTaskComplete(state.tasks, taskId, completedAt);
  if (!taskTransition.ok) {
    return unchanged(
      state,
      taskTransition.message ?? "The task could not be completed.",
    );
  }

  if (!task.sourceProjectId || !task.sourceProjectStepId) {
    return changed({ ...state, tasks: taskTransition.tasks });
  }

  const step = state.projectSteps.find(
    (item) => item.id === task.sourceProjectStepId,
  );
  if (!projectOwnsStep(task.sourceProjectId, step)) {
    return changed({ ...state, tasks: taskTransition.tasks });
  }

  return changed({
    tasks: taskTransition.tasks,
    projectSteps: state.projectSteps.map((item) =>
      item.id === step.id
        ? {
            ...item,
            status: "completed",
            completedAt: item.completedAt ?? completedAt,
          }
        : item,
    ),
    projects: state.projects.map((project) =>
      project.id === task.sourceProjectId
        ? {
            ...project,
            nextActionId:
              project.nextActionId === step.id
                ? undefined
                : project.nextActionId,
            updatedAt: completedAt,
          }
        : project,
    ),
  });
}

export function updateProjectStatus(
  state: ProjectDataState,
  projectId: string,
  status: Exclude<ProjectStatus, "completed">,
  updatedAt: string,
): ProjectTransition {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return unchanged(state, "That project is no longer available.");
  if (project.status === "completed") {
    return unchanged(state, "Completed projects cannot be reactivated yet.");
  }

  return changed({
    ...state,
    projects: state.projects.map((item) =>
      item.id === projectId ? { ...item, status, updatedAt } : item,
    ),
  });
}

export function completeProjectOutcome(
  state: ProjectDataState,
  projectId: string,
  completedAt: string,
): ProjectTransition {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return unchanged(state, "That project is no longer available.");

  const projectStepIds = new Set(
    state.projectSteps
      .filter((step) => step.projectId === projectId)
      .map((step) => step.id),
  );

  return changed({
    tasks: state.tasks.map((task) =>
      task.sourceProjectStepId &&
      projectStepIds.has(task.sourceProjectStepId) &&
      task.status !== "completed"
        ? {
            ...task,
            status: "completed",
            completedAt,
            today: false,
            now: false,
          }
        : task,
    ),
    projectSteps: state.projectSteps.map((step) =>
      step.projectId === projectId
        ? {
            ...step,
            status: "completed",
            completedAt: step.completedAt ?? completedAt,
          }
        : step,
    ),
    projects: state.projects.map((item) =>
      item.id === projectId
        ? {
            ...item,
            status: "completed",
            completedAt,
            updatedAt: completedAt,
            nextActionId: undefined,
          }
        : item,
    ),
  });
}
