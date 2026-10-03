import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getOrderedChildSteps, isExecutableStep } from "@/store/project-rules";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { ProjectStep } from "@/types/project";

interface ProjectStepTreeProps {
  projectId: string;
  steps: ProjectStep[];
  nextActionId?: string;
  onComplete: (step: ProjectStep) => void;
  onParse: (step: ProjectStep) => void;
  onSetNextAction: (step: ProjectStep) => void;
}

interface StepBranchProps extends ProjectStepTreeProps {
  parentStepId?: string;
  depth: number;
}

function StepBranch({
  projectId,
  steps,
  nextActionId,
  onComplete,
  onParse,
  onSetNextAction,
  parentStepId,
  depth,
}: StepBranchProps) {
  const children = getOrderedChildSteps(steps, projectId, parentStepId);

  return (
    <>
      {children.map((step) => {
        const executable = isExecutableStep(step, steps);
        const isCompleted = step.status === "completed";
        const isNext = step.id === nextActionId;
        const hasChildren = steps.some(
          (candidate) => candidate.parentStepId === step.id,
        );

        return (
          <View key={step.id}>
            <View
              style={[
                styles.row,
                { marginLeft: Math.min(depth, 4) * spacing.lg },
                depth > 0 && styles.nestedRow,
                isNext && styles.nextRow,
                isCompleted && styles.completedRow,
              ]}
            >
              <View style={styles.titleRow}>
                <Ionicons
                  color={isCompleted ? colors.disabled : colors.accent}
                  name={
                    isCompleted
                      ? "checkmark-circle"
                      : hasChildren
                        ? "git-branch-outline"
                        : "ellipse-outline"
                  }
                  size={18}
                />
                <Text
                  style={[styles.title, isCompleted && styles.completedTitle]}
                >
                  {step.title}
                </Text>
              </View>
              <View style={styles.badges}>
                {isNext ? (
                  <Text style={styles.nextBadge}>NEXT ACTION</Text>
                ) : null}
                {!isCompleted && !executable ? (
                  <Text style={styles.groupBadge}>OUTCOME</Text>
                ) : null}
              </View>
              {!isCompleted ? (
                <View style={styles.actions}>
                  {executable ? (
                    <Pressable
                      onPress={() => onSetNextAction(step)}
                      style={({ pressed }) => [
                        styles.action,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.actionText}>
                        {isNext ? "Selected" : "Make next"}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => onParse(step)}
                    style={({ pressed }) => [
                      styles.action,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.actionText}>Parse</Text>
                  </Pressable>
                  {executable ? (
                    <Pressable
                      onPress={() => onComplete(step)}
                      style={({ pressed }) => [
                        styles.action,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.actionText, styles.completeText]}>
                        Complete
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
            <StepBranch
              depth={depth + 1}
              nextActionId={nextActionId}
              onComplete={onComplete}
              onParse={onParse}
              onSetNextAction={onSetNextAction}
              parentStepId={step.id}
              projectId={projectId}
              steps={steps}
            />
          </View>
        );
      })}
    </>
  );
}

export function ProjectStepTree(props: ProjectStepTreeProps) {
  return <StepBranch {...props} depth={0} />;
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  nestedRow: {
    borderLeftColor: colors.accentSoft,
    borderLeftWidth: 3,
  },
  nextRow: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  completedRow: {
    backgroundColor: colors.surfaceMuted,
    opacity: 0.72,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    lineHeight: 21,
  },
  completedTitle: {
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  badges: {
    flexDirection: "row",
    gap: spacing.xs,
    marginLeft: 26,
    marginTop: spacing.xs,
  },
  nextBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    color: colors.accent,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  groupBadge: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
    paddingVertical: 3,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginLeft: 26,
    marginTop: spacing.md,
  },
  action: {
    minHeight: 28,
    justifyContent: "center",
  },
  actionText: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  completeText: {
    color: colors.success,
  },
  pressed: {
    opacity: 0.55,
  },
});
