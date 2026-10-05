export interface ActiveSlot {
  id: string;
  name: string;
  maxActiveProjects: number;
  order: number;
  enabled: boolean;
}

export interface WeeklyReview {
  id: string;
  weekStartDate: string;
  startedAt: string;
  completedAt?: string;
  selectedFocusProjectIds: string[];
  notes?: string;
}

export interface FocusActionResult {
  ok: boolean;
  message?: string;
  projectId?: string;
  reviewId?: string;
  conflictingProjectIds?: string[];
}

export const DEFAULT_ACTIVE_SLOTS: ActiveSlot[] = [
  {
    id: "slot-build",
    name: "Build",
    maxActiveProjects: 1,
    order: 0,
    enabled: true,
  },
  {
    id: "slot-learn",
    name: "Learn",
    maxActiveProjects: 1,
    order: 1,
    enabled: true,
  },
  {
    id: "slot-personal",
    name: "Personal",
    maxActiveProjects: 1,
    order: 2,
    enabled: true,
  },
];
