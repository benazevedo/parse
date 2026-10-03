import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PriorityPicker } from "@/components/PriorityPicker";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { TaskActionResult, TaskPriority } from "@/types/task";

function showError(result: TaskActionResult): boolean {
  if (!result.ok) {
    Alert.alert("Not changed", result.message);
  }
  return result.ok;
}

export default function InboxScreen() {
  const tasks = useTaskStore((state) => state.tasks);
  const addToToday = useTaskStore((state) => state.addToToday);
  const completeTask = useTaskStore((state) => state.completeTask);
  const [planningTaskId, setPlanningTaskId] = useState<string | null>(null);
  const inboxTasks = tasks.filter((task) => task.status === "inbox");

  const planTask = (taskId: string, priority: TaskPriority) => {
    if (showError(addToToday(taskId, priority))) {
      setPlanningTaskId(null);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        subtitle="Captured thoughts wait here until you decide what matters."
        title="Inbox"
      />

      {inboxTasks.length === 0 ? (
        <EmptyState
          icon="file-tray-outline"
          message="New captures will wait here. You do not need to organize anything yet."
          title="Your inbox is clear"
        />
      ) : (
        <View style={styles.list}>
          <Text style={styles.count}>
            {inboxTasks.length} {inboxTasks.length === 1 ? "item" : "items"} to
            consider
          </Text>
          {inboxTasks.map((task) => {
            const isPlanning = planningTaskId === task.id;

            return (
              <View key={task.id} style={styles.card}>
                <Text style={styles.title}>{task.title}</Text>
                {task.notes ? (
                  <Text style={styles.notes}>{task.notes}</Text>
                ) : null}

                {isPlanning ? (
                  <View style={styles.priorityPanel}>
                    <Text style={styles.priorityPrompt}>
                      Where does this fit today?
                    </Text>
                    <PriorityPicker
                      onSelect={(priority) => planTask(task.id, priority)}
                    />
                    <Pressable
                      onPress={() => setPlanningTaskId(null)}
                      style={styles.cancelChoice}
                    >
                      <Text style={styles.cancelChoiceText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => setPlanningTaskId(task.id)}
                      style={({ pressed }) => [
                        styles.todayButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        color={colors.surface}
                        name="calendar-outline"
                        size={17}
                      />
                      <Text style={styles.todayButtonText}>Add to Today</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => showError(completeTask(task.id))}
                      style={({ pressed }) => [
                        styles.completeButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        color={colors.success}
                        name="checkmark-circle-outline"
                        size={18}
                      />
                      <Text style={styles.completeText}>Complete</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  count: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: 24,
  },
  notes: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  todayButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.lg,
  },
  todayButtonText: {
    color: colors.surface,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  completeButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
  },
  completeText: {
    color: colors.success,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  priorityPanel: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  priorityPrompt: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.md,
  },
  cancelChoice: {
    alignSelf: "center",
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  cancelChoiceText: {
    color: colors.muted,
    fontSize: typography.size.caption,
  },
  pressed: {
    opacity: 0.68,
  },
});
