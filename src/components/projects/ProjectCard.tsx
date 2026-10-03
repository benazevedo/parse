import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { Project, ProjectStep } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  steps: ProjectStep[];
  onPress: () => void;
}

export function ProjectCard({ project, steps, onPress }: ProjectCardProps) {
  const completedCount = steps.filter(
    (step) => step.status === "completed",
  ).length;
  const nextAction = steps.find((step) => step.id === project.nextActionId);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.heading}>
        <Text style={styles.title}>{project.title}</Text>
        <Ionicons color={colors.muted} name="chevron-forward" size={18} />
      </View>
      <Text numberOfLines={2} style={styles.outcome}>
        {project.desiredOutcome}
      </Text>
      <View style={styles.divider} />
      {nextAction ? (
        <View style={styles.nextRow}>
          <View style={styles.nextIcon}>
            <Ionicons color={colors.accent} name="arrow-forward" size={13} />
          </View>
          <View style={styles.nextCopy}>
            <Text style={styles.nextLabel}>NEXT ACTION</Text>
            <Text numberOfLines={1} style={styles.nextTitle}>
              {nextAction.title}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.noNext}>No Next Action selected</Text>
      )}
      <Text style={styles.progress}>
        {steps.length === 0
          ? "Not parsed yet"
          : `${completedCount} of ${steps.length} steps complete`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  heading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: 23,
  },
  outcome: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  nextRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  nextIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  nextCopy: {
    flex: 1,
  },
  nextLabel: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },
  nextTitle: {
    color: colors.text,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    marginTop: 2,
  },
  noNext: {
    color: colors.muted,
    fontSize: typography.size.caption,
    fontStyle: "italic",
  },
  progress: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
