import { canAssignMust, MAX_TODAY_MUSTS } from "./task-rules";
import type { Task, TaskActionResult, TaskPriority } from "../types/task";

export interface TaskTransition extends TaskActionResult {
  tasks: Task[];
}

const mustLimitMessage = `Today can hold up to ${MAX_TODAY_MUSTS} incomplete Must items. Complete, remove, or reprioritize one before adding another.`;

function failure(tasks: Task[], message: string): TaskTransition {
  return { tasks, ok: false, message };
}

function missingTask(tasks: Task[]): TaskTransition {
  return failure(tasks, "That item is no longer available.");
}

export function addTaskToToday(
  tasks: Task[],
  taskId: string,
  priority: TaskPriority,
): TaskTransition {
  const task = tasks.find((item) => item.id === taskId);

  if (!task) return missingTask(tasks);
  if (task.status === "completed") {
    return failure(tasks, "Completed items cannot be added to Today.");
  }
  if (priority === "must" && !canAssignMust(tasks, taskId)) {
    return failure(tasks, mustLimitMessage);
  }

  return {
    ok: true,
    tasks: tasks.map((item) =>
      item.id === taskId
        ? { ...item, status: "active", today: true, priority }
        : item,
    ),
  };
}

export function selectNowTask(tasks: Task[], taskId: string): TaskTransition {
  const task = tasks.find((item) => item.id === taskId);

  if (!task) return missingTask(tasks);
  if (!task.today || task.status === "completed") {
    return failure(tasks, "Only an incomplete Today item can become Now.");
  }

  return {
    ok: true,
    tasks: tasks.map((item) => ({ ...item, now: item.id === taskId })),
  };
}

export function markTaskComplete(
  tasks: Task[],
  taskId: string,
  completedAt: string,
): TaskTransition {
  if (!tasks.some((item) => item.id === taskId)) return missingTask(tasks);

  return {
    ok: true,
    tasks: tasks.map((item) =>
      item.id === taskId
        ? {
            ...item,
            status: "completed",
            completedAt,
            today: false,
            now: false,
          }
        : item,
    ),
  };
}

export function returnTaskToInbox(
  tasks: Task[],
  taskId: string,
): TaskTransition {
  const task = tasks.find((item) => item.id === taskId);

  if (!task) return missingTask(tasks);
  if (task.status === "completed") {
    return failure(tasks, "This item is already complete.");
  }

  return {
    ok: true,
    tasks: tasks.map((item) =>
      item.id === taskId
        ? { ...item, status: "inbox", today: false, now: false }
        : item,
    ),
  };
}

export function updateTaskPriority(
  tasks: Task[],
  taskId: string,
  priority: TaskPriority,
): TaskTransition {
  const task = tasks.find((item) => item.id === taskId);

  if (!task) return missingTask(tasks);
  if (priority === "must" && task.today && !canAssignMust(tasks, taskId)) {
    return failure(tasks, mustLimitMessage);
  }

  return {
    ok: true,
    tasks: tasks.map((item) =>
      item.id === taskId ? { ...item, priority } : item,
    ),
  };
}
