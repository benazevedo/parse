import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href, useLocalSearchParams } from "expo-router";
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
  if (!result.ok) Alert.alert("Not changed", result.message);
  return result.ok;
}

export default function InboxScreen() {
  const { undoCaptureId, outcome, undoToken } = useLocalSearchParams<{
    undoCaptureId?: string;
    outcome?: string;
    undoToken?: string;
  }>();
  const tasks = useTaskStore((state) => state.tasks);
  const captureItems = useTaskStore((state) => state.captureItems);
  const addToToday = useTaskStore((state) => state.addToToday);
  const completeTask = useTaskStore((state) => state.completeTask);
  const undoCaptureProcessing = useTaskStore(
    (state) => state.undoCaptureProcessing,
  );
  const restoreArchivedCapture = useTaskStore(
    (state) => state.restoreArchivedCapture,
  );
  const [planningTaskId, setPlanningTaskId] = useState<string | null>(null);
  const [dismissedUndoToken, setDismissedUndoToken] = useState<string | null>(
    null,
  );
  const [showArchived, setShowArchived] = useState(false);
  const undoId =
    undoCaptureId && undoToken !== dismissedUndoToken ? undoCaptureId : null;
  const inboxTasks = tasks.filter((task) => task.status === "inbox");
  const captured = captureItems.filter((item) => item.status === "inbox");
  const archived = captureItems.filter((item) => item.status === "archived");
  const empty = captured.length === 0 && inboxTasks.length === 0;

  const planTask = (taskId: string, priority: TaskPriority) => {
    if (showError(addToToday(taskId, priority))) setPlanningTaskId(null);
  };

  const undo = () => {
    if (!undoId) return;
    const result = undoCaptureProcessing(undoId);
    if (showError(result)) setDismissedUndoToken(undoToken ?? undoId);
  };

  return (
    <Screen>
      <ScreenHeader
        subtitle="Raw thoughts wait safely until you decide what they should become."
        title="Inbox"
      />

      {undoId ? (
        <View style={styles.undoBanner}>
          <Ionicons color={colors.success} name="checkmark-circle" size={20} />
          <Text style={styles.undoText}>{outcome ?? "Capture processed"}</Text>
          <Pressable onPress={undo} style={styles.undoButton}>
            <Text style={styles.undoButtonText}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

      {empty ? (
        <EmptyState
          icon="file-tray-outline"
          message="Capture anything that is taking up space. You can decide what it means later."
          title="Nothing waiting for you."
        />
      ) : null}

      {captured.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionLabel}>CAPTURED</Text>
            <Text style={styles.count}>{captured.length}</Text>
          </View>
          <Text style={styles.sectionSupport}>
            Unprocessed thoughts, not obligations.
          </Text>
          <View style={styles.list}>
            {captured.map((item) => (
              <View key={item.id} style={styles.captureCard}>
                <View style={styles.captureIcon}>
                  <Ionicons
                    color={colors.accent}
                    name="sparkles-outline"
                    size={18}
                  />
                </View>
                <View style={styles.captureCopy}>
                  <Text style={styles.captureContent}>{item.content}</Text>
                  {item.notes ? (
                    <Text style={styles.notes}>{item.notes}</Text>
                  ) : null}
                  <Text style={styles.source}>{item.source ?? "typed"}</Text>
                </View>
                <Pressable
                  accessibilityLabel={`Process ${item.content}`}
                  onPress={() =>
                    router.push({
                      pathname: "/triage/[id]",
                      params: { id: item.id },
                    } as unknown as Href)
                  }
                  style={({ pressed }) => [
                    styles.process,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.processText}>Process</Text>
                  <Ionicons
                    color={colors.surface}
                    name="arrow-forward"
                    size={15}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {inboxTasks.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionLabel}>TASK INBOX</Text>
            <Text style={styles.count}>{inboxTasks.length}</Text>
          </View>
          <Text style={styles.sectionSupport}>
            Actionable work not assigned to Today.
          </Text>
          <View style={styles.list}>
            {inboxTasks.map((task) => {
              const isPlanning = planningTaskId === task.id;
              return (
                <View key={task.id} style={styles.taskCard}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.notes ? (
                    <Text style={styles.notes}>{task.notes}</Text>
                  ) : null}
                  {task.sourceCaptureId ? (
                    <Text style={styles.source}>FROM CAPTURE</Text>
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
                          styles.secondaryAction,
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
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/planning/task/[taskId]",
                            params: { taskId: task.id },
                          } as unknown as Href)
                        }
                        style={({ pressed }) => [
                          styles.secondaryAction,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons
                          color={colors.accent}
                          name="time-outline"
                          size={17}
                        />
                        <Text style={styles.estimateText}>
                          {task.estimatedMinutes
                            ? `${task.estimatedMinutes} min`
                            : "Estimate"}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {archived.length ? (
        <View style={styles.archiveSection}>
          <Pressable
            onPress={() => setShowArchived((value) => !value)}
            style={styles.archiveToggle}
          >
            <Text style={styles.sectionLabel}>ARCHIVED CAPTURES</Text>
            <Text style={styles.count}>{archived.length}</Text>
            <Ionicons
              color={colors.muted}
              name={showArchived ? "chevron-up" : "chevron-down"}
              size={16}
            />
          </Pressable>
          {showArchived ? (
            <View style={styles.list}>
              {archived.map((item) => (
                <View key={item.id} style={styles.archivedRow}>
                  <Text style={styles.archivedContent}>{item.content}</Text>
                  <Pressable
                    onPress={() => showError(restoreArchivedCapture(item.id))}
                  >
                    <Text style={styles.restoreText}>Restore</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  undoBanner: {
    alignItems: "center",
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
    padding: spacing.md,
  },
  undoText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  undoButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  undoButtonText: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  section: { marginBottom: spacing.xxxl },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  count: { color: colors.muted, fontSize: typography.size.caption },
  sectionSupport: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  list: { gap: spacing.md },
  captureCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  captureIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  captureCopy: { flex: 1 },
  captureContent: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: 23,
  },
  notes: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  source: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.1,
    marginTop: spacing.sm,
    textTransform: "uppercase",
  },
  process: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  processText: {
    color: colors.surface,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  taskTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: 24,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
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
  secondaryAction: {
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
  estimateText: {
    color: colors.accent,
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
  cancelChoiceText: { color: colors.muted, fontSize: typography.size.caption },
  archiveSection: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
  },
  archiveToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
  },
  archivedRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  archivedContent: {
    color: colors.muted,
    flex: 1,
    fontSize: typography.size.body,
  },
  restoreText: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  pressed: { opacity: 0.68 },
});
