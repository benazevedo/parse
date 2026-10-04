import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PriorityPicker } from "@/components/PriorityPicker";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { Task, TaskPriority } from "@/types/task";

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  onSetNow: () => void;
  onRemove: () => void;
  onChangePriority: (priority: TaskPriority) => void;
  onPlan: () => void;
  scheduledLabel?: string;
}

export function TaskCard({
  task,
  onComplete,
  onSetNow,
  onRemove,
  onChangePriority,
  onPlan,
  scheduledLabel,
}: TaskCardProps) {
  return (
    <View style={[styles.card, task.now && styles.nowCard]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{task.title}</Text>
        {task.now ? <Text style={styles.nowBadge}>NOW</Text> : null}
      </View>
      {task.notes ? <Text style={styles.notes}>{task.notes}</Text> : null}
      <Pressable
        onPress={onPlan}
        style={({ pressed }) => [styles.planRow, pressed && styles.pressed]}
      >
        <Ionicons color={colors.muted} name="time-outline" size={16} />
        <Text style={styles.planText}>
          {scheduledLabel ??
            (task.estimatedMinutes
              ? `${task.estimatedMinutes} min estimated · Schedule`
              : "Estimate & schedule")}
        </Text>
        <Ionicons color={colors.muted} name="chevron-forward" size={15} />
      </Pressable>
      <PriorityPicker
        compact
        onSelect={onChangePriority}
        value={task.priority}
      />
      <View style={styles.actions}>
        <Pressable
          onPress={onSetNow}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons color={colors.accent} name="locate-outline" size={16} />
          <Text style={styles.actionText}>
            {task.now ? "Focused" : "Set Now"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onComplete}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons
            color={colors.success}
            name="checkmark-circle-outline"
            size={17}
          />
          <Text style={[styles.actionText, styles.completeText]}>Complete</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Remove from Today"
          hitSlop={6}
          onPress={onRemove}
          style={({ pressed }) => [
            styles.iconAction,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color={colors.muted} name="arrow-undo-outline" size={17} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.lg,
  },
  nowCard: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  titleRow: {
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
  nowBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    color: colors.accent,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  notes: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
  },
  planRow: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  planText: {
    color: colors.muted,
    flex: 1,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  actions: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 32,
  },
  actionText: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  completeText: {
    color: colors.success,
  },
  iconAction: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    minHeight: 32,
    minWidth: 32,
  },
  pressed: {
    opacity: 0.58,
  },
});
