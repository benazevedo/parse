export type TaskStatus = "inbox" | "active" | "completed";

export type TaskPriority = "must" | "should" | "could";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  status: TaskStatus;
  priority: TaskPriority;
  today: boolean;
  now: boolean;
  estimatedMinutes?: number;
  sourceProjectId?: string;
  sourceProjectStepId?: string;
  sourceRoutineId?: string;
  sourceRoutineDate?: string;
  sourceCaptureId?: string;
}

export interface TaskActionResult {
  ok: boolean;
  message?: string;
}
