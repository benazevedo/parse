export type ProjectStatus = "active" | "parked" | "someday" | "completed";

export type ProjectStepStatus = "active" | "completed";

export interface Project {
  id: string;
  title: string;
  desiredOutcome: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  status: ProjectStatus;
  domain?: string;
  nextActionId?: string;
  activeSlotId?: string;
}

export interface ProjectStep {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  completedAt?: string;
  status: ProjectStepStatus;
  order: number;
  parentStepId?: string;
}

export interface CreateProjectInput {
  title: string;
  desiredOutcome: string;
  status?: Exclude<ProjectStatus, "completed">;
  activeSlotId?: string;
}

export interface ProjectActionResult {
  ok: boolean;
  message?: string;
  projectId?: string;
  stepIds?: string[];
  taskId?: string;
}
