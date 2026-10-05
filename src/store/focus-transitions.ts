import type {
  ActiveSlot,
  FocusActionResult,
  WeeklyReview,
} from "../types/focus";
import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
} from "../types/project";
import {
  addLocalDays,
  getMondayWeek,
  parseLocalDateKey,
} from "../utils/recurrence";

export interface FocusDataState {
  projects: Project[];
  activeSlots: ActiveSlot[];
  weeklyReviews: WeeklyReview[];
}

export interface FocusTransition extends FocusActionResult, FocusDataState {}

function unchanged(
  state: FocusDataState,
  message: string,
  conflictingProjectIds?: string[],
): FocusTransition {
  return { ...state, ok: false, message, conflictingProjectIds };
}

function changed(
  state: FocusDataState,
  result: Omit<FocusActionResult, "ok"> = {},
): FocusTransition {
  return { ...state, ...result, ok: true };
}

export function getSlotOccupants(
  projects: Project[],
  slotId: string,
  excludingProjectId?: string,
): Project[] {
  return projects.filter(
    (project) =>
      project.status === "active" &&
      project.activeSlotId === slotId &&
      project.id !== excludingProjectId,
  );
}

function validateSlot(
  state: FocusDataState,
  slotId: string,
  excludingProjectId?: string,
): { slot?: ActiveSlot; conflicts: Project[]; message?: string } {
  const slot = state.activeSlots.find((item) => item.id === slotId);
  if (!slot)
    return { conflicts: [], message: "That focus slot is unavailable." };
  if (!slot.enabled) {
    return { slot, conflicts: [], message: `${slot.name} is disabled.` };
  }
  const occupants = getSlotOccupants(
    state.projects,
    slot.id,
    excludingProjectId,
  );
  const conflicts = occupants.slice(slot.maxActiveProjects - 1);
  return conflicts.length
    ? {
        slot,
        conflicts,
        message: `${slot.name} is full. Park an active project there before continuing.`,
      }
    : { slot, conflicts: [] };
}

export function createProjectWithFocus(
  state: FocusDataState,
  input: CreateProjectInput,
  projectId: string,
  timestamp: string,
): FocusTransition {
  const title = input.title.trim();
  const desiredOutcome = input.desiredOutcome.trim();
  const status = input.status ?? "active";
  if (!title || !desiredOutcome) {
    return unchanged(state, "Name the project and its desired outcome.");
  }
  if (status !== "active" && input.activeSlotId) {
    return unchanged(state, "Only active projects can occupy a focus slot.");
  }
  if (status === "active" && input.activeSlotId) {
    const validation = validateSlot(state, input.activeSlotId);
    if (validation.message) {
      return unchanged(
        state,
        validation.message,
        validation.conflicts.map((project) => project.id),
      );
    }
  }
  const project: Project = {
    id: projectId,
    title,
    desiredOutcome,
    createdAt: timestamp,
    updatedAt: timestamp,
    status,
    activeSlotId: status === "active" ? input.activeSlotId : undefined,
  };
  return changed(
    { ...state, projects: [project, ...state.projects] },
    { projectId },
  );
}

export function setProjectFocus(
  state: FocusDataState,
  projectId: string,
  status: Exclude<ProjectStatus, "completed">,
  activeSlotId: string | undefined,
  updatedAt: string,
): FocusTransition {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return unchanged(state, "That project is no longer available.");
  if (project.status === "completed") {
    return unchanged(state, "Completed projects cannot be reactivated yet.");
  }
  if (status !== "active" && activeSlotId) {
    return unchanged(state, "Only active projects can occupy a focus slot.");
  }
  if (status === "active" && activeSlotId) {
    const validation = validateSlot(state, activeSlotId, projectId);
    if (validation.message) {
      return unchanged(
        state,
        validation.message,
        validation.conflicts.map((item) => item.id),
      );
    }
  }
  return changed(
    {
      ...state,
      projects: state.projects.map((item) =>
        item.id === projectId
          ? {
              ...item,
              status,
              activeSlotId: status === "active" ? activeSlotId : undefined,
              updatedAt,
            }
          : item,
      ),
    },
    { projectId },
  );
}

export function parkAndActivateProject(
  state: FocusDataState,
  projectId: string,
  slotId: string,
  projectIdsToPark: string[],
  updatedAt: string,
): FocusTransition {
  const target = state.projects.find((project) => project.id === projectId);
  const slot = state.activeSlots.find((item) => item.id === slotId);
  if (!target) return unchanged(state, "That project is no longer available.");
  if (target.status === "completed") {
    return unchanged(state, "Completed projects cannot be reactivated yet.");
  }
  if (!slot || !slot.enabled) {
    return unchanged(state, "That focus slot is unavailable.");
  }
  const occupantIds = new Set(
    getSlotOccupants(state.projects, slotId, projectId).map((item) => item.id),
  );
  if (projectIdsToPark.some((id) => !occupantIds.has(id))) {
    return unchanged(
      state,
      "Only projects currently in this slot can be parked.",
    );
  }
  const remaining = [...occupantIds].filter(
    (id) => !projectIdsToPark.includes(id),
  );
  if (remaining.length >= slot.maxActiveProjects) {
    return unchanged(
      state,
      `${slot.name} is still full. Choose an active project there to park.`,
      remaining,
    );
  }
  const parkIds = new Set(projectIdsToPark);
  return changed(
    {
      ...state,
      projects: state.projects.map((project) => {
        if (parkIds.has(project.id)) {
          return {
            ...project,
            status: "parked",
            activeSlotId: undefined,
            updatedAt,
          };
        }
        if (project.id === projectId) {
          return {
            ...project,
            status: "active",
            activeSlotId: slotId,
            updatedAt,
          };
        }
        return project;
      }),
    },
    { projectId },
  );
}

export function saveActiveSlot(
  state: FocusDataState,
  input: ActiveSlot,
): FocusTransition {
  const slot = state.activeSlots.find((item) => item.id === input.id);
  if (!slot) return unchanged(state, "That focus slot is unavailable.");
  const name = input.name.trim();
  if (!name) return unchanged(state, "Give this slot a name.");
  if (
    !Number.isInteger(input.maxActiveProjects) ||
    input.maxActiveProjects < 1
  ) {
    return unchanged(
      state,
      "A focus slot must allow at least one active project.",
    );
  }
  const usage = getSlotOccupants(state.projects, input.id).length;
  if (input.maxActiveProjects < usage) {
    return unchanged(
      state,
      `${slot.name} currently holds ${usage} active ${usage === 1 ? "project" : "projects"}. Park one before lowering its capacity.`,
    );
  }
  if (!input.enabled && usage > 0) {
    return unchanged(
      state,
      `${slot.name} still has active work. Park it before disabling this slot.`,
    );
  }
  return changed({
    ...state,
    activeSlots: state.activeSlots.map((item) =>
      item.id === input.id ? { ...input, name } : item,
    ),
  });
}

export function startWeeklyReview(
  state: FocusDataState,
  reviewId: string,
  date: string,
  startedAt: string,
): FocusTransition {
  const weekStartDate = getMondayWeek(date)[0];
  const existing = state.weeklyReviews.find(
    (review) => review.weekStartDate === weekStartDate,
  );
  if (existing) return changed(state, { reviewId: existing.id });
  const review: WeeklyReview = {
    id: reviewId,
    weekStartDate,
    startedAt,
    selectedFocusProjectIds: [],
  };
  return changed(
    { ...state, weeklyReviews: [review, ...state.weeklyReviews] },
    { reviewId },
  );
}

export function completeWeeklyReview(
  state: FocusDataState,
  reviewId: string,
  notes: string | undefined,
  completedAt: string,
): FocusTransition {
  const review = state.weeklyReviews.find((item) => item.id === reviewId);
  if (!review) return unchanged(state, "That weekly review is unavailable.");
  if (review.completedAt)
    return unchanged(state, "This review is already complete.");
  const selectedFocusProjectIds = state.projects
    .filter((project) => project.status === "active" && project.activeSlotId)
    .map((project) => project.id);
  return changed(
    {
      ...state,
      weeklyReviews: state.weeklyReviews.map((item) =>
        item.id === reviewId
          ? {
              ...item,
              completedAt,
              notes: notes?.trim() || undefined,
              selectedFocusProjectIds,
            }
          : item,
      ),
    },
    { reviewId },
  );
}

export type ProjectActivity = "moved" | "no_activity";

export function getProjectActivity(
  project: Project,
  weekStartDate: string,
): ProjectActivity {
  const start = parseLocalDateKey(weekStartDate);
  const end = parseLocalDateKey(addLocalDays(weekStartDate, 7));
  const updated = new Date(project.updatedAt);
  if (!start || !end || Number.isNaN(updated.getTime())) return "no_activity";
  return updated >= start && updated < end ? "moved" : "no_activity";
}
