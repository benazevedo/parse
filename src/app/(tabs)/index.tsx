import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { PriorityPicker } from "@/components/PriorityPicker";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TaskCard } from "@/components/TaskCard";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { FixedCommitment, TaskTimeBlock } from "@/types/planning";
import type {
  RecurrenceActionResult,
  RecurringCommitmentOccurrence,
  RoutineOccurrence,
} from "@/types/recurrence";
import type { Task, TaskActionResult, TaskPriority } from "@/types/task";
import { formatToday } from "@/utils/date";
import {
  getRecurringCommitmentOccurrences,
  getRoutineOccurrences,
} from "@/utils/recurrence";
import {
  compareTimeRanges,
  describeDurationComparison,
  formatLocalTime,
  formatMinutes,
  getLocalDateKey,
  getCurrentAndNextRange,
  getRangeDurationMinutes,
  getRemainingUnscheduledMinutes,
} from "@/utils/time";

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

type TimelineEntry =
  | {
      kind: "commitment";
      item: FixedCommitment | RecurringCommitmentOccurrence;
    }
  | { kind: "task"; item: TaskTimeBlock; task: Task };

function showResult(result: TaskActionResult | RecurrenceActionResult) {
  if (!result.ok) Alert.alert("Not changed", result.message);
}

function taskPlanningHref(taskId: string, date: string): Href {
  return {
    pathname: "/planning/task/[taskId]",
    params: { taskId, date },
  } as unknown as Href;
}

function commitmentHref(date: string, id?: string): Href {
  return {
    pathname: "/planning/commitment",
    params: { date, ...(id ? { id } : {}) },
  } as unknown as Href;
}

function occurrenceHref(id: string, date: string): Href {
  return {
    pathname: "/rhythm/occurrence/[id]",
    params: { id, date },
  } as unknown as Href;
}

interface PrioritySectionProps {
  priority: TaskPriority;
  tasks: Task[];
  date: string;
}

function PrioritySection({ priority, tasks, date }: PrioritySectionProps) {
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
              onPlan={() => router.push(taskPlanningHref(task.id, date))}
              onRemove={() => showResult(removeFromToday(task.id))}
              onSetNow={() => showResult(setNow(task.id))}
              task={task}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyGroup}>Nothing unscheduled here.</Text>
      )}
    </View>
  );
}

function TimelineTaskActions({ task, date }: { task: Task; date: string }) {
  const completeTask = useTaskStore((state) => state.completeTask);
  const setNow = useTaskStore((state) => state.setNow);
  const removeFromToday = useTaskStore((state) => state.removeFromToday);
  const changePriority = useTaskStore((state) => state.changePriority);

  return (
    <>
      <PriorityPicker
        compact
        onSelect={(priority) => showResult(changePriority(task.id, priority))}
        value={task.priority}
      />
      <View style={styles.timelineActions}>
        <Pressable
          onPress={() => showResult(setNow(task.id))}
          style={styles.timelineAction}
        >
          <Ionicons color={colors.accent} name="locate-outline" size={15} />
          <Text style={styles.timelineActionText}>
            {task.now ? "Focused" : "Set Now"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => showResult(completeTask(task.id))}
          style={styles.timelineAction}
        >
          <Ionicons
            color={colors.success}
            name="checkmark-circle-outline"
            size={16}
          />
          <Text style={[styles.timelineActionText, styles.completeText]}>
            Complete
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Edit schedule for ${task.title}`}
          hitSlop={6}
          onPress={() => router.push(taskPlanningHref(task.id, date))}
          style={styles.timelineIconAction}
        >
          <Ionicons color={colors.muted} name="create-outline" size={17} />
        </Pressable>
        <Pressable
          accessibilityLabel={`Remove ${task.title} from Today`}
          hitSlop={6}
          onPress={() => showResult(removeFromToday(task.id))}
          style={styles.timelineIconAction}
        >
          <Ionicons color={colors.muted} name="arrow-undo-outline" size={16} />
        </Pressable>
      </View>
    </>
  );
}

function RoutineCard({
  occurrence,
  date,
  task,
}: {
  occurrence: RoutineOccurrence;
  date: string;
  task?: Task;
}) {
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "should",
  );
  const addRoutineOccurrenceToToday = useTaskStore(
    (state) => state.addRoutineOccurrenceToToday,
  );
  const setRoutineOccurrenceStatus = useTaskStore(
    (state) => state.setRoutineOccurrenceStatus,
  );
  const completeTask = useTaskStore((state) => state.completeTask);
  const setNow = useTaskStore((state) => state.setNow);
  const changePriority = useTaskStore((state) => state.changePriority);
  const routine = occurrence.routine;

  const updatePriority = (nextPriority: TaskPriority) => {
    setPriority(nextPriority);
    if (task) showResult(changePriority(task.id, nextPriority));
  };

  return (
    <View
      style={[
        styles.routineCard,
        occurrence.status !== "pending" && styles.routineCardSettled,
      ]}
    >
      <View style={styles.routineHeading}>
        <View
          style={[
            styles.routineIcon,
            occurrence.status === "completed" && styles.routineIconComplete,
          ]}
        >
          <Ionicons
            color={
              occurrence.status === "completed" ? colors.success : colors.accent
            }
            name={
              occurrence.status === "completed"
                ? "checkmark"
                : occurrence.status === "skipped"
                  ? "remove-outline"
                  : "leaf-outline"
            }
            size={18}
          />
        </View>
        <View style={styles.routineCopy}>
          <Text style={styles.routineTitle}>{routine.title}</Text>
          <Text style={styles.routineMeta}>
            {routine.estimatedMinutes
              ? `${routine.estimatedMinutes} min`
              : "No estimate"}
            {routine.defaultTime
              ? ` · usually ${formatLocalTime(routine.defaultTime)}`
              : ""}
            {routine.domain ? ` · ${routine.domain}` : ""}
          </Text>
        </View>
        {occurrence.status !== "pending" ? (
          <Text style={styles.routineStatus}>{occurrence.status}</Text>
        ) : null}
      </View>

      {occurrence.status === "pending" ? (
        <>
          <PriorityPicker
            compact
            onSelect={updatePriority}
            value={task?.priority ?? priority}
          />
          <View style={styles.routineActions}>
            {task ? (
              <>
                <Pressable
                  onPress={() => showResult(setNow(task.id))}
                  style={styles.routineAction}
                >
                  <Ionicons
                    color={colors.accent}
                    name="locate-outline"
                    size={16}
                  />
                  <Text style={styles.routineActionText}>
                    {task.now ? "Focused" : "Set Now"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(taskPlanningHref(task.id, date))}
                  style={styles.routineAction}
                >
                  <Ionicons
                    color={colors.accent}
                    name="time-outline"
                    size={16}
                  />
                  <Text style={styles.routineActionText}>Schedule</Text>
                </Pressable>
                <Pressable
                  onPress={() => showResult(completeTask(task.id))}
                  style={styles.routineAction}
                >
                  <Ionicons
                    color={colors.success}
                    name="checkmark-circle-outline"
                    size={16}
                  />
                  <Text style={[styles.routineActionText, styles.completeText]}>
                    Complete
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() =>
                    showResult(
                      addRoutineOccurrenceToToday(routine.id, date, priority),
                    )
                  }
                  style={[styles.routineAction, styles.primaryRoutineAction]}
                >
                  <Ionicons color={colors.surface} name="add" size={16} />
                  <Text style={styles.primaryRoutineActionText}>
                    Add to Today
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    showResult(
                      setRoutineOccurrenceStatus(routine.id, date, "completed"),
                    )
                  }
                  style={styles.routineAction}
                >
                  <Text style={[styles.routineActionText, styles.completeText]}>
                    Complete
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    showResult(
                      setRoutineOccurrenceStatus(routine.id, date, "skipped"),
                    )
                  }
                  style={styles.routineAction}
                >
                  <Text style={styles.routineActionText}>Skip today</Text>
                </Pressable>
              </>
            )}
          </View>
        </>
      ) : occurrence.status === "skipped" ? (
        <Pressable
          onPress={() =>
            showResult(setRoutineOccurrenceStatus(routine.id, date, "pending"))
          }
          style={styles.restoreRoutine}
        >
          <Text style={styles.routineActionText}>Restore for today</Text>
        </Pressable>
      ) : (
        <Text style={styles.settledCopy}>Complete for this date.</Text>
      )}
    </View>
  );
}

export default function TodayScreen() {
  const tasks = useTaskStore((state) => state.tasks);
  const dayPlans = useTaskStore((state) => state.dayPlans);
  const recurrenceRules = useTaskStore((state) => state.recurrenceRules);
  const recurringCommitments = useTaskStore(
    (state) => state.recurringCommitments,
  );
  const recurrenceOverrides = useTaskStore(
    (state) => state.recurrenceOverrides,
  );
  const routines = useTaskStore((state) => state.routines);
  const routineStates = useTaskStore((state) => state.routineStates);
  const completeTask = useTaskStore((state) => state.completeTask);
  const [clock, setClock] = useState(() => new Date());
  const date = getLocalDateKey(clock);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const todayTasks = tasks.filter(
    (task) => task.today && task.status !== "completed",
  );
  const nowTask = todayTasks.find((task) => task.now);
  const plan = dayPlans.find((item) => item.date === date);
  const recurringOccurrences = getRecurringCommitmentOccurrences(
    date,
    recurrenceRules,
    recurringCommitments,
    recurrenceOverrides,
  );
  const routineOccurrences = getRoutineOccurrences(
    date,
    recurrenceRules,
    routines,
    routineStates,
  );
  const activeBlocks = (plan?.timeBlocks ?? []).filter((block) =>
    todayTasks.some((task) => task.id === block.taskId),
  );
  const timeline: TimelineEntry[] = [
    ...(plan?.commitments ?? []).map((item): TimelineEntry => ({
      kind: "commitment",
      item,
    })),
    ...recurringOccurrences.map((item): TimelineEntry => ({
      kind: "commitment",
      item,
    })),
    ...activeBlocks.flatMap((item): TimelineEntry[] => {
      const task = todayTasks.find((candidate) => candidate.id === item.taskId);
      return task ? [{ kind: "task", item, task }] : [];
    }),
  ].sort((left, right) => compareTimeRanges(left.item, right.item));
  const scheduledTaskIds = new Set(activeBlocks.map((block) => block.taskId));
  const unscheduledTasks = todayTasks.filter(
    (task) => !scheduledTaskIds.has(task.id),
  );
  const remainingMinutes = getRemainingUnscheduledMinutes(
    timeline.map((entry) => entry.item),
  );
  const nowMinutes = clock.getHours() * 60 + clock.getMinutes();
  const { current: currentEntry, next: nextEntry } = getCurrentAndNextRange(
    timeline.map((entry) => ({ ...entry, ...entry.item })),
    nowMinutes,
  );
  const nowBlock = nowTask
    ? activeBlocks.find((block) => block.taskId === nowTask.id)
    : undefined;
  const entryTitle = (entry: TimelineEntry) =>
    entry.kind === "commitment" ? entry.item.title : entry.task.title;

  return (
    <Screen>
      <ScreenHeader
        eyebrow="TODAY"
        subtitle={`${formatToday(clock)} · Choose clearly, then begin.`}
        title="Make today enough."
      />

      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>NOW</Text>
        <Text style={styles.sectionHint}>One chosen action</Text>
      </View>
      <View style={[styles.nowCard, !nowTask && styles.nowCardEmpty]}>
        {nowTask ? (
          <>
            <View style={styles.nowIcon}>
              <Ionicons color={colors.surface} name="locate" size={22} />
            </View>
            <Text style={styles.nowTitle}>{nowTask.title}</Text>
            {nowBlock ? (
              <Text style={styles.nowSchedule}>
                {currentEntry?.kind === "task" &&
                currentEntry.task.id === nowTask.id
                  ? `Scheduled now · until ${formatLocalTime(nowBlock.endTime)}`
                  : `Scheduled ${formatLocalTime(nowBlock.startTime)}–${formatLocalTime(nowBlock.endTime)}`}
              </Text>
            ) : null}
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

      <View style={styles.timelineHeading}>
        <View>
          <Text style={styles.sectionLabel}>DAY TIMELINE</Text>
          <Text style={styles.timelineSupport}>
            {formatMinutes(remainingMinutes)} unscheduled · 5 AM–11 PM
          </Text>
        </View>
        <View style={styles.timelineHeaderActions}>
          <Pressable
            onPress={() => router.push("/week" as Href)}
            style={({ pressed }) => [
              styles.weekLink,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons color={colors.accent} name="calendar-outline" size={16} />
            <Text style={styles.addCommitmentText}>Week</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(commitmentHref(date))}
            style={({ pressed }) => [
              styles.addCommitment,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons color={colors.accent} name="add" size={17} />
            <Text style={styles.addCommitmentText}>Commitment</Text>
          </Pressable>
        </View>
      </View>

      {currentEntry || nextEntry ? (
        <View style={styles.scheduleReality}>
          <Ionicons color={colors.accent} name="time-outline" size={18} />
          <Text style={styles.scheduleRealityText}>
            {currentEntry
              ? `Current: ${entryTitle(currentEntry)} until ${formatLocalTime(currentEntry.item.endTime)}`
              : `Next: ${entryTitle(nextEntry!)} at ${formatLocalTime(nextEntry!.item.startTime)}`}
          </Text>
        </View>
      ) : null}

      {timeline.length ? (
        <View style={styles.timelineList}>
          {timeline.map((entry) => {
            const duration = getRangeDurationMinutes(entry.item);
            return (
              <View
                key={`${entry.kind}-${entry.item.id}`}
                style={[
                  styles.timelineRow,
                  entry.kind === "task" && styles.taskBlock,
                ]}
              >
                <View style={styles.timeColumn}>
                  <Text style={styles.startTime}>
                    {formatLocalTime(entry.item.startTime)}
                  </Text>
                  <Text style={styles.endTime}>
                    {formatLocalTime(entry.item.endTime)}
                  </Text>
                </View>
                <View style={styles.timelineLine}>
                  <View
                    style={[
                      styles.timelineDot,
                      entry.kind === "task" && styles.taskDot,
                    ]}
                  />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineTitleRow}>
                    <Text style={styles.timelineType}>
                      {entry.kind === "commitment"
                        ? "recurringCommitmentId" in entry.item
                          ? "RECURRING COMMITMENT"
                          : "COMMITMENT"
                        : `${entry.task.priority.toUpperCase()} TASK`}
                    </Text>
                    {entry.kind === "commitment" ? (
                      <Pressable
                        accessibilityLabel={`Edit ${entry.item.title}`}
                        hitSlop={8}
                        onPress={() =>
                          router.push(
                            "recurringCommitmentId" in entry.item
                              ? occurrenceHref(
                                  entry.item.recurringCommitmentId,
                                  date,
                                )
                              : commitmentHref(date, entry.item.id),
                          )
                        }
                      >
                        <Ionicons
                          color={colors.muted}
                          name="create-outline"
                          size={17}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                  <Text style={styles.timelineTitle}>{entryTitle(entry)}</Text>
                  {entry.kind === "commitment" && entry.item.notes ? (
                    <Text style={styles.timelineNotes}>{entry.item.notes}</Text>
                  ) : null}
                  {entry.kind === "task" ? (
                    <>
                      <Text style={styles.durationCopy}>
                        {describeDurationComparison(
                          duration,
                          entry.task.estimatedMinutes,
                        )}
                      </Text>
                      <TimelineTaskActions date={date} task={entry.task} />
                    </>
                  ) : (
                    <Text style={styles.durationCopy}>
                      {formatMinutes(duration)} fixed
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.timelineEmpty}>
          <Ionicons color={colors.muted} name="time-outline" size={22} />
          <Text style={styles.timelineEmptyTitle}>The day is still open.</Text>
          <Text style={styles.timelineEmptyText}>
            Add fixed commitments, then place Today work around them.
          </Text>
        </View>
      )}

      <View style={styles.routinesHeading}>
        <View>
          <Text style={styles.sectionLabel}>ROUTINES</Text>
          <Text style={styles.todaySubhead}>
            Today&apos;s rhythm, without streaks or pressure.
          </Text>
        </View>
        <Text style={styles.totalCount}>{routineOccurrences.length}</Text>
      </View>
      {routineOccurrences.length ? (
        <View style={styles.routineList}>
          {routineOccurrences.map((occurrence) => {
            const linkedTask = tasks.find(
              (task) =>
                task.id === occurrence.linkedTaskId ||
                (task.sourceRoutineId === occurrence.routine.id &&
                  task.sourceRoutineDate === date &&
                  task.status !== "completed"),
            );
            return (
              <RoutineCard
                date={date}
                key={occurrence.id}
                occurrence={occurrence}
                task={linkedTask}
              />
            );
          })}
        </View>
      ) : (
        <View style={styles.routineEmpty}>
          <Ionicons color={colors.muted} name="leaf-outline" size={20} />
          <Text style={styles.routineEmptyText}>
            No routines ask for your attention today.
          </Text>
        </View>
      )}

      <View style={styles.todayHeading}>
        <View>
          <Text style={styles.sectionLabel}>UNSCHEDULED TODAY</Text>
          <Text style={styles.todaySubhead}>
            {activeBlocks.length
              ? `${activeBlocks.length} scheduled · the rest still need a time.`
              : "A small plan you can actually finish."}
          </Text>
        </View>
        <Text style={styles.totalCount}>{unscheduledTasks.length}</Text>
      </View>

      {todayTasks.length === 0 ? (
        <View style={styles.todayEmpty}>
          <Text style={styles.timelineEmptyTitle}>
            Nothing is required today.
          </Text>
          <Text style={styles.timelineEmptyText}>
            Add an Inbox item when you decide what deserves your attention.
          </Text>
        </View>
      ) : unscheduledTasks.length === 0 ? (
        <View style={styles.todayEmpty}>
          <Text style={styles.timelineEmptyTitle}>
            Every Today task has a time.
          </Text>
          <Text style={styles.timelineEmptyText}>
            Use the timeline to focus, complete, reprioritize, or adjust them.
          </Text>
        </View>
      ) : (
        (["must", "should", "could"] as TaskPriority[]).map((priority) => (
          <PrioritySection
            date={date}
            key={priority}
            priority={priority}
            tasks={unscheduledTasks.filter(
              (task) => task.priority === priority,
            )}
          />
        ))
      )}
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
  sectionHint: { color: colors.muted, fontSize: typography.size.caption },
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
  nowIconEmpty: { backgroundColor: colors.accentSoft },
  nowTitle: {
    color: colors.surface,
    fontSize: 27,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  nowSchedule: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: radii.pill,
    color: colors.surface,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.md,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  nowActivePhrase: { color: "#DDE8E2" },
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
  buttonPressed: { opacity: 0.76 },
  timelineHeading: {
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  timelineSupport: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.xs,
  },
  timelineHeaderActions: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.md,
  },
  weekLink: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  addCommitment: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  addCommitmentText: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  scheduleReality: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  scheduleRealityText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  timelineList: { marginBottom: spacing.xxxl },
  timelineRow: { flexDirection: "row", minHeight: 112 },
  taskBlock: { minHeight: 190 },
  timeColumn: { paddingTop: spacing.md, width: 72 },
  startTime: {
    color: colors.ink,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  endTime: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  timelineLine: {
    alignItems: "center",
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    marginHorizontal: spacing.md,
    width: 1,
  },
  timelineDot: {
    backgroundColor: colors.could,
    borderColor: colors.background,
    borderRadius: radii.pill,
    borderWidth: 3,
    height: 13,
    marginTop: spacing.lg,
    width: 13,
  },
  taskDot: { backgroundColor: colors.accent },
  timelineContent: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  timelineTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timelineType: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.1,
  },
  timelineTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xs,
  },
  timelineNotes: {
    color: colors.muted,
    fontSize: typography.size.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  durationCopy: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.sm,
  },
  timelineActions: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  timelineAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 30,
  },
  timelineActionText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: typography.weight.semibold,
  },
  completeText: { color: colors.success },
  timelineIconAction: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    minHeight: 30,
    minWidth: 24,
  },
  timelineEmpty: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    marginBottom: spacing.xxxl,
    padding: spacing.xl,
  },
  timelineEmptyTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  timelineEmptyText: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  todayHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  routinesHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  routineList: { gap: spacing.md, marginBottom: spacing.xxxl },
  routineCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  routineCardSettled: { backgroundColor: colors.surfaceMuted },
  routineHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  routineIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  routineIconComplete: { backgroundColor: "#E8F3EC" },
  routineCopy: { flex: 1 },
  routineTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  routineMeta: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.xs,
    textTransform: "capitalize",
  },
  routineStatus: {
    color: colors.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    textTransform: "capitalize",
  },
  routineActions: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  routineAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 34,
  },
  routineActionText: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  primaryRoutineAction: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  primaryRoutineActionText: {
    color: colors.surface,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  restoreRoutine: { marginTop: spacing.md, minHeight: 32 },
  settledCopy: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.md,
  },
  routineEmpty: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xxxl,
    padding: spacing.lg,
  },
  routineEmptyText: {
    color: colors.muted,
    flex: 1,
    fontSize: typography.size.body,
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
  todayEmpty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xxxl,
    padding: spacing.xl,
  },
  prioritySection: { marginBottom: spacing.xxl },
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
  priorityCopy: { flex: 1 },
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
  taskList: { gap: spacing.md },
  emptyGroup: {
    color: colors.muted,
    fontSize: typography.size.body,
    fontStyle: "italic",
    paddingLeft: spacing.xl,
    paddingVertical: spacing.sm,
  },
});
