export interface FixedCommitment {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
  createdAt: string;
}

export interface TaskTimeBlock {
  id: string;
  date: string;
  taskId: string;
  startTime: string;
  endTime: string;
}

export interface DayPlan {
  date: string;
  commitments: FixedCommitment[];
  timeBlocks: TaskTimeBlock[];
}

export interface CommitmentInput {
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface TaskScheduleInput {
  date: string;
  taskId: string;
  startTime: string;
  endTime: string;
  estimatedMinutes?: number;
}

export interface PlanningActionResult {
  ok: boolean;
  message?: string;
  id?: string;
}
