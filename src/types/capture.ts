import type { ProjectStatus } from "./project";
import type { TaskPriority } from "./task";

export type CaptureStatus = "inbox" | "processed" | "archived";
export type CaptureSource = "typed" | "voice" | "shared";
export type CaptureOutcome =
  "task" | "project" | "knowledge" | "someday" | "archive";

export interface CaptureItem {
  id: string;
  content: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
  status: CaptureStatus;
  source?: CaptureSource;
  outcome?: CaptureOutcome;
  outcomeId?: string;
}

export const KNOWLEDGE_KINDS = [
  "idea",
  "reference",
  "quote",
  "person",
  "place",
  "book",
  "media",
  "gift",
  "genealogy",
  "inspiration",
  "writing",
  "other",
] as const;

export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

export const KNOWLEDGE_DOMAINS = [
  "family",
  "faith",
  "fitness",
  "home",
  "learning",
  "career",
  "business",
  "travel",
  "creative",
  "personal",
] as const;

export type KnowledgeDomain = (typeof KNOWLEDGE_DOMAINS)[number];
export type KnowledgeDisposition = "reference" | "someday";

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  kind: KnowledgeKind;
  domain?: KnowledgeDomain;
  disposition: KnowledgeDisposition;
  sourceCaptureId?: string;
  archivedAt?: string;
}

export interface CaptureInput {
  content: string;
  notes?: string;
  source?: CaptureSource;
}

export interface ProcessCaptureTaskInput {
  title: string;
  notes?: string;
  priority: TaskPriority;
  addToToday: boolean;
  estimatedMinutes?: number;
}

export interface ProcessCaptureProjectInput {
  title: string;
  desiredOutcome: string;
  status: Exclude<ProjectStatus, "completed">;
  activeSlotId?: string;
}

export interface ProcessCaptureKnowledgeInput {
  title: string;
  kind: KnowledgeKind;
  domain?: KnowledgeDomain;
  disposition: KnowledgeDisposition;
}

export interface UpdateKnowledgeInput {
  title: string;
  content: string;
  kind: KnowledgeKind;
  domain?: KnowledgeDomain;
}

export interface CaptureActionResult {
  ok: boolean;
  message?: string;
  captureItemId?: string;
  taskId?: string;
  projectId?: string;
  knowledgeItemId?: string;
  conflictingProjectIds?: string[];
}
