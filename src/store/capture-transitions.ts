import {
  createProjectWithFocus,
  parkAndActivateProject,
} from "./focus-transitions";
import { addTaskToToday } from "./task-transitions";
import type {
  CaptureActionResult,
  CaptureInput,
  CaptureItem,
  KnowledgeItem,
  ProcessCaptureKnowledgeInput,
  ProcessCaptureProjectInput,
  ProcessCaptureTaskInput,
  UpdateKnowledgeInput,
} from "../types/capture";
import type { ActiveSlot, WeeklyReview } from "../types/focus";
import type { Project } from "../types/project";
import type { Task } from "../types/task";

export interface CaptureDataState {
  captureItems: CaptureItem[];
  knowledgeItems: KnowledgeItem[];
  tasks: Task[];
  projects: Project[];
  activeSlots: ActiveSlot[];
  weeklyReviews: WeeklyReview[];
}

export interface CaptureTransition
  extends CaptureActionResult, CaptureDataState {}

function unchanged(
  state: CaptureDataState,
  message: string,
  result: Partial<CaptureActionResult> = {},
): CaptureTransition {
  return { ...state, ...result, ok: false, message };
}

function changed(
  state: CaptureDataState,
  result: Omit<CaptureActionResult, "ok"> = {},
): CaptureTransition {
  return { ...state, ...result, ok: true };
}

function availableCapture(
  state: CaptureDataState,
  captureItemId: string,
): CaptureItem | undefined {
  return state.captureItems.find(
    (item) => item.id === captureItemId && item.status === "inbox",
  );
}

function markProcessed(
  captureItems: CaptureItem[],
  captureItemId: string,
  processedAt: string,
  outcome: CaptureItem["outcome"],
  outcomeId?: string,
): CaptureItem[] {
  return captureItems.map((item) =>
    item.id === captureItemId
      ? {
          ...item,
          status: outcome === "archive" ? "archived" : "processed",
          processedAt,
          outcome,
          outcomeId,
        }
      : item,
  );
}

export function createCaptureItem(
  state: CaptureDataState,
  input: CaptureInput,
  captureItemId: string,
  createdAt: string,
): CaptureTransition {
  const content = input.content.trim();
  const notes = input.notes?.trim();
  if (!content) return unchanged(state, "Write down the thought first.");
  const captureItem: CaptureItem = {
    id: captureItemId,
    content,
    notes: notes || undefined,
    createdAt,
    status: "inbox",
    source: input.source ?? "typed",
  };
  return changed(
    { ...state, captureItems: [captureItem, ...state.captureItems] },
    { captureItemId },
  );
}

export function processCaptureAsTask(
  state: CaptureDataState,
  captureItemId: string,
  input: ProcessCaptureTaskInput,
  taskId: string,
  processedAt: string,
): CaptureTransition {
  const capture = availableCapture(state, captureItemId);
  if (!capture) {
    return unchanged(state, "This capture has already been processed.");
  }
  const title = input.title.trim();
  const notes = input.notes?.trim();
  if (!title) return unchanged(state, "Give the task a clear title.");
  if (
    input.estimatedMinutes !== undefined &&
    (!Number.isInteger(input.estimatedMinutes) || input.estimatedMinutes <= 0)
  ) {
    return unchanged(state, "Use a positive whole-minute estimate.");
  }

  const task: Task = {
    id: taskId,
    title,
    notes: notes || undefined,
    createdAt: processedAt,
    status: "inbox",
    priority: input.priority,
    today: false,
    now: false,
    estimatedMinutes: input.estimatedMinutes,
    sourceCaptureId: capture.id,
  };
  let tasks = [task, ...state.tasks];
  if (input.addToToday) {
    const todayResult = addTaskToToday(tasks, task.id, input.priority);
    if (!todayResult.ok) {
      return unchanged(
        state,
        todayResult.message ?? "This task could not be added to Today.",
      );
    }
    tasks = todayResult.tasks;
  }
  return changed(
    {
      ...state,
      tasks,
      captureItems: markProcessed(
        state.captureItems,
        capture.id,
        processedAt,
        "task",
        task.id,
      ),
    },
    { captureItemId: capture.id, taskId: task.id },
  );
}

export function processCaptureAsProject(
  state: CaptureDataState,
  captureItemId: string,
  input: ProcessCaptureProjectInput,
  projectId: string,
  processedAt: string,
  projectIdsToPark: string[] = [],
): CaptureTransition {
  const capture = availableCapture(state, captureItemId);
  if (!capture) {
    return unchanged(state, "This capture has already been processed.");
  }
  const focusState = {
    projects: state.projects,
    activeSlots: state.activeSlots,
    weeklyReviews: state.weeklyReviews,
  };
  let focusResult;
  if (
    input.status === "active" &&
    input.activeSlotId &&
    projectIdsToPark.length > 0
  ) {
    const parkedCreation = createProjectWithFocus(
      focusState,
      { ...input, status: "parked", activeSlotId: undefined },
      projectId,
      processedAt,
    );
    if (!parkedCreation.ok) {
      return unchanged(state, parkedCreation.message ?? "Project not created.");
    }
    focusResult = parkAndActivateProject(
      {
        projects: parkedCreation.projects,
        activeSlots: parkedCreation.activeSlots,
        weeklyReviews: parkedCreation.weeklyReviews,
      },
      projectId,
      input.activeSlotId,
      projectIdsToPark,
      processedAt,
    );
  } else {
    focusResult = createProjectWithFocus(
      focusState,
      input,
      projectId,
      processedAt,
    );
  }
  if (!focusResult.ok) {
    return unchanged(state, focusResult.message ?? "Project not created.", {
      conflictingProjectIds: focusResult.conflictingProjectIds,
    });
  }
  const projects = focusResult.projects.map((project) =>
    project.id === projectId
      ? { ...project, sourceCaptureId: capture.id }
      : project,
  );
  return changed(
    {
      ...state,
      projects,
      activeSlots: focusResult.activeSlots,
      weeklyReviews: focusResult.weeklyReviews,
      captureItems: markProcessed(
        state.captureItems,
        capture.id,
        processedAt,
        "project",
        projectId,
      ),
    },
    { captureItemId: capture.id, projectId },
  );
}

export function processCaptureAsKnowledge(
  state: CaptureDataState,
  captureItemId: string,
  input: ProcessCaptureKnowledgeInput,
  knowledgeItemId: string,
  processedAt: string,
): CaptureTransition {
  const capture = availableCapture(state, captureItemId);
  if (!capture) {
    return unchanged(state, "This capture has already been processed.");
  }
  const title = input.title.trim();
  if (!title) return unchanged(state, "Give this memory a title.");
  const knowledgeItem: KnowledgeItem = {
    id: knowledgeItemId,
    title,
    content: capture.notes
      ? `${capture.content}\n\n${capture.notes}`
      : capture.content,
    createdAt: processedAt,
    updatedAt: processedAt,
    kind: input.kind,
    domain: input.domain,
    disposition: input.disposition,
    sourceCaptureId: capture.id,
  };
  const outcome = input.disposition === "someday" ? "someday" : "knowledge";
  return changed(
    {
      ...state,
      knowledgeItems: [knowledgeItem, ...state.knowledgeItems],
      captureItems: markProcessed(
        state.captureItems,
        capture.id,
        processedAt,
        outcome,
        knowledgeItem.id,
      ),
    },
    { captureItemId: capture.id, knowledgeItemId: knowledgeItem.id },
  );
}

export function archiveCaptureItem(
  state: CaptureDataState,
  captureItemId: string,
  archivedAt: string,
): CaptureTransition {
  const capture = availableCapture(state, captureItemId);
  if (!capture) {
    return unchanged(state, "This capture has already been processed.");
  }
  return changed(
    {
      ...state,
      captureItems: markProcessed(
        state.captureItems,
        capture.id,
        archivedAt,
        "archive",
      ),
    },
    { captureItemId: capture.id },
  );
}

export function restoreArchivedCaptureItem(
  state: CaptureDataState,
  captureItemId: string,
): CaptureTransition {
  const capture = state.captureItems.find((item) => item.id === captureItemId);
  if (!capture || capture.status !== "archived") {
    return unchanged(state, "That archived capture is unavailable.");
  }
  return changed({
    ...state,
    captureItems: state.captureItems.map((item) =>
      item.id === capture.id
        ? {
            ...item,
            status: "inbox",
            processedAt: undefined,
            outcome: undefined,
            outcomeId: undefined,
          }
        : item,
    ),
  });
}

export function undoCaptureProcessing(
  state: CaptureDataState,
  captureItemId: string,
): CaptureTransition {
  const capture = state.captureItems.find((item) => item.id === captureItemId);
  if (!capture || capture.status === "inbox" || !capture.outcome) {
    return unchanged(state, "There is nothing to undo for this capture.");
  }
  return changed({
    ...state,
    tasks:
      capture.outcome === "task"
        ? state.tasks.filter((task) => task.id !== capture.outcomeId)
        : state.tasks,
    projects:
      capture.outcome === "project"
        ? state.projects.filter((project) => project.id !== capture.outcomeId)
        : state.projects,
    knowledgeItems:
      capture.outcome === "knowledge" || capture.outcome === "someday"
        ? state.knowledgeItems.filter((item) => item.id !== capture.outcomeId)
        : state.knowledgeItems,
    captureItems: state.captureItems.map((item) =>
      item.id === capture.id
        ? {
            ...item,
            status: "inbox",
            processedAt: undefined,
            outcome: undefined,
            outcomeId: undefined,
          }
        : item,
    ),
  });
}

export interface KnowledgeTransition extends CaptureActionResult {
  knowledgeItems: KnowledgeItem[];
}

export function updateKnowledgeItem(
  knowledgeItems: KnowledgeItem[],
  knowledgeItemId: string,
  input: UpdateKnowledgeInput,
  updatedAt: string,
): KnowledgeTransition {
  const item = knowledgeItems.find(
    (candidate) => candidate.id === knowledgeItemId,
  );
  if (!item) {
    return {
      knowledgeItems,
      ok: false,
      message: "That memory is unavailable.",
    };
  }
  const title = input.title.trim();
  const content = input.content.trim();
  if (!title || !content) {
    return {
      knowledgeItems,
      ok: false,
      message: "Keep both a title and the remembered content.",
    };
  }
  return {
    knowledgeItems: knowledgeItems.map((candidate) =>
      candidate.id === item.id
        ? { ...candidate, ...input, title, content, updatedAt }
        : candidate,
    ),
    ok: true,
    knowledgeItemId: item.id,
  };
}

export function setKnowledgeItemArchived(
  knowledgeItems: KnowledgeItem[],
  knowledgeItemId: string,
  archived: boolean,
  updatedAt: string,
): KnowledgeTransition {
  if (!knowledgeItems.some((item) => item.id === knowledgeItemId)) {
    return {
      knowledgeItems,
      ok: false,
      message: "That memory is unavailable.",
    };
  }
  return {
    knowledgeItems: knowledgeItems.map((item) =>
      item.id === knowledgeItemId
        ? {
            ...item,
            archivedAt: archived ? updatedAt : undefined,
            updatedAt,
          }
        : item,
    ),
    ok: true,
    knowledgeItemId,
  };
}
