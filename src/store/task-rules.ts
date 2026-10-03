import type { Task } from "../types/task";

export const MAX_TODAY_MUSTS = 3;

export function isIncompleteTodayMust(task: Task): boolean {
  return task.today && task.status !== "completed" && task.priority === "must";
}

export function canAssignMust(tasks: Task[], taskId: string): boolean {
  const otherMusts = tasks.filter(
    (task) => task.id !== taskId && isIncompleteTodayMust(task),
  );

  return otherMusts.length < MAX_TODAY_MUSTS;
}
