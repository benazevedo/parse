import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TaskCard } from "@/components/TaskCard";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { Task, TaskActionResult, TaskPriority } from "@/types/task";
import { formatToday } from "@/utils/date";

const priorityDetails: Record<
  TaskPriority,
  { label: string; color: string; description: string }
> = {
  must: {
    label: "Must",
    color: colors.must,
    description: "Essential today · limit 3",
  },
  should: {
    label: "Should",
    color: colors.should,
    description: "Important if capacity allows",
  },
  could: {
    label: "Could",
    color: colors.could,
    description: "Optional, without pressure",
  },
};

function showResult(result: TaskActionResult) {
  if (!result.ok) {
    Alert.alert("Not changed", result.message);
  }
}

interface PrioritySectionProps {
  priority: TaskPriority;
  tasks: Task[];
}

function PrioritySection({ priority, tasks }: PrioritySectionProps) {
  const completeTask = useTaskStore((state) => state.completeTask);
  const setNow = useTaskStore((state) => state.setNow);
  const removeFromToday = useTaskStore((state) => state.removeFromToday);
  const changePriority = useTaskStore((state) => state.changePriority);
  const details = priorityDetails[priority];

  return (
    <View style={styles.prioritySection}>
      <View style={styles.priorityHeader}>
        <View
          style={[styles.priorityDot, { backgroundColor: details.color }]}
        />
        <View style={styles.priorityCopy}>
          <Text style={styles.priorityTitle}>
            {details.label}{" "}
            <Text style={styles.priorityCount}>{tasks.length}</Text>
          </Text>
          <Text style={styles.priorityDescription}>{details.description}</Text>
        </View>
      </View>
      {tasks.length ? (
        <View style={styles.taskList}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              onChangePriority={(nextPriority) =>
                showResult(changePriority(task.id, nextPriority))
              }
              onComplete={() => showResult(completeTask(task.id))}
              onRemove={() => showResult(removeFromToday(task.id))}
              onSetNow={() => showResult(setNow(task.id))}
              task={task}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyGroup}>Nothing here.</Text>
      )}
    </View>
  );
}

export default function TodayScreen() {
  const tasks = useTaskStore((state) => state.tasks);
  const completeTask = useTaskStore((state) => state.completeTask);
  const todayTasks = tasks.filter(
    (task) => task.today && task.status !== "completed",
  );
  const nowTask = todayTasks.find((task) => task.now);

  return (
    <Screen>
      <ScreenHeader
        eyebrow="TODAY"
        subtitle={`${formatToday()} · Choose clearly, then begin.`}
        title="Make today enough."
      />

      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>NOW</Text>
        <Text style={styles.sectionHint}>One action</Text>
      </View>
      <View style={[styles.nowCard, !nowTask && styles.nowCardEmpty]}>
        {nowTask ? (
          <>
            <View style={styles.nowIcon}>
              <Ionicons color={colors.surface} name="locate" size={22} />
            </View>
            <Text style={styles.nowTitle}>{nowTask.title}</Text>
            {nowTask.notes ? (
              <Text style={styles.nowNotes}>{nowTask.notes}</Text>
            ) : null}
            <Text style={[styles.nowPhrase, styles.nowActivePhrase]}>
              Nothing else is required of you right now.
            </Text>
            <Pressable
              onPress={() => showResult(completeTask(nowTask.id))}
              style={({ pressed }) => [
                styles.completeButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons color={colors.accent} name="checkmark" size={20} />
              <Text style={styles.completeButtonText}>Complete</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={[styles.nowIcon, styles.nowIconEmpty]}>
              <Ionicons color={colors.accent} name="locate-outline" size={22} />
            </View>
            <Text style={styles.nowEmptyTitle}>Nothing is in focus.</Text>
            <Text style={styles.nowEmptyText}>
              When you are ready, choose one Today item as Now.
            </Text>
            <Text style={styles.nowPhrase}>
              Nothing else is required of you right now.
            </Text>
          </>
        )}
      </View>

      <View style={styles.todayHeading}>
        <View>
          <Text style={styles.sectionLabel}>TODAY PRIORITIES</Text>
          <Text style={styles.todaySubhead}>
            A small plan you can actually finish.
          </Text>
        </View>
        <Text style={styles.totalCount}>{todayTasks.length}</Text>
      </View>

      {(["must", "should", "could"] as TaskPriority[]).map((priority) => (
        <PrioritySection
          key={priority}
          priority={priority}
          tasks={todayTasks.filter((task) => task.priority === priority)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionLabel: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.6,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: typography.size.caption,
  },
  nowCard: {
    alignItems: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    marginBottom: spacing.xxxl,
    padding: spacing.xl,
  },
  nowCardEmpty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nowIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    marginBottom: spacing.xl,
    width: 44,
  },
  nowIconEmpty: {
    backgroundColor: colors.accentSoft,
  },
  nowTitle: {
    color: colors.surface,
    fontSize: 27,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  nowNotes: {
    color: "#DDE8E2",
    fontSize: typography.size.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  nowEmptyTitle: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
  },
  nowEmptyText: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  nowPhrase: {
    color: colors.muted,
    fontSize: typography.size.caption,
    lineHeight: 18,
    marginTop: spacing.xl,
  },
  nowActivePhrase: {
    color: "#DDE8E2",
  },
  completeButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.xl,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
  },
  completeButtonText: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  buttonPressed: {
    opacity: 0.76,
  },
  todayHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  todaySubhead: {
    color: colors.muted,
    fontSize: typography.size.body,
    marginTop: spacing.sm,
  },
  totalCount: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    minWidth: 30,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    textAlign: "center",
  },
  prioritySection: {
    marginBottom: spacing.xxl,
  },
  priorityHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  priorityDot: {
    borderRadius: radii.pill,
    height: 9,
    marginRight: spacing.md,
    width: 9,
  },
  priorityCopy: {
    flex: 1,
  },
  priorityTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  priorityCount: {
    color: colors.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  priorityDescription: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: 2,
  },
  taskList: {
    gap: spacing.md,
  },
  emptyGroup: {
    color: colors.muted,
    fontSize: typography.size.body,
    fontStyle: "italic",
    paddingLeft: spacing.xl,
    paddingVertical: spacing.sm,
  },
});
