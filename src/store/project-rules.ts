import type { ProjectStep } from "../types/project";

export function projectOwnsStep(
  projectId: string,
  step: ProjectStep | undefined,
): step is ProjectStep {
  return Boolean(step && step.projectId === projectId);
}

export function getIncompleteChildSteps(
  steps: ProjectStep[],
  stepId: string,
): ProjectStep[] {
  return steps.filter(
    (step) => step.parentStepId === stepId && step.status === "active",
  );
}

export function isExecutableStep(
  step: ProjectStep,
  steps: ProjectStep[],
): boolean {
  return (
    step.status === "active" &&
    getIncompleteChildSteps(steps, step.id).length === 0
  );
}

export function getOrderedChildSteps(
  steps: ProjectStep[],
  projectId: string,
  parentStepId?: string,
): ProjectStep[] {
  return steps
    .filter(
      (step) =>
        step.projectId === projectId && step.parentStepId === parentStepId,
    )
    .sort((left, right) => left.order - right.order);
}
