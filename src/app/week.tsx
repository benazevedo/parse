import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import {
  addLocalDays,
  getMondayWeek,
  getRecurringCommitmentOccurrences,
  getRoutineOccurrences,
  parseLocalDateKey,
} from "@/utils/recurrence";
import {
  compareTimeRanges,
  formatLocalTime,
  getLocalDateKey,
} from "@/utils/time";

function occurrenceHref(id: string, date: string): Href {
  return {
    pathname: "/rhythm/occurrence/[id]",
    params: { id, date },
  } as unknown as Href;
}

function formatDay(dateKey: string) {
  const date = parseLocalDateKey(dateKey);
  return date
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(date)
    : dateKey;
}

function formatWeekRange(dates: string[]) {
  const first = parseLocalDateKey(dates[0]);
  const last = parseLocalDateKey(dates[dates.length - 1]);
  if (!first || !last) return "This week";
  const firstLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(first);
  const lastLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(last);
  return `${firstLabel}–${lastLabel}`;
}

export default function WeekScreen() {
  const [anchorDate, setAnchorDate] = useState(() => getLocalDateKey());
  const tasks = useTaskStore((state) => state.tasks);
  const dayPlans = useTaskStore((state) => state.dayPlans);
  const rules = useTaskStore((state) => state.recurrenceRules);
  const commitments = useTaskStore((state) => state.recurringCommitments);
  const overrides = useTaskStore((state) => state.recurrenceOverrides);
  const routines = useTaskStore((state) => state.routines);
  const routineStates = useTaskStore((state) => state.routineStates);
  const dates = useMemo(() => getMondayWeek(anchorDate), [anchorDate]);
  const today = getLocalDateKey();

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Back to Life"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.navButton}
        >
          <Ionicons color={colors.accent} name="chevron-back" size={23} />
        </Pressable>
        <Text style={styles.topTitle}>Week</Text>
        <View style={styles.navButton} />
      </View>

      <Text style={styles.eyebrow}>WEEK</Text>
      <Text style={styles.title}>See the shape of your days.</Text>
      <Text style={styles.subtitle}>
        Commitments, scheduled work, and routines—without turning the week into
        a dense calendar.
      </Text>

      <View style={styles.weekNav}>
        <Pressable
          accessibilityLabel="Previous week"
          onPress={() => setAnchorDate(addLocalDays(dates[0], -7))}
          style={styles.weekButton}
        >
          <Ionicons color={colors.accent} name="chevron-back" size={19} />
        </Pressable>
        <Pressable
          onPress={() => setAnchorDate(today)}
          style={styles.rangeButton}
        >
          <Text style={styles.rangeText}>{formatWeekRange(dates)}</Text>
          <Text style={styles.rangeSupport}>Tap to return to this week</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Next week"
          onPress={() => setAnchorDate(addLocalDays(dates[0], 7))}
          style={styles.weekButton}
        >
          <Ionicons color={colors.accent} name="chevron-forward" size={19} />
        </Pressable>
      </View>

      <View style={styles.days}>
        {dates.map((date) => {
          const plan = dayPlans.find((item) => item.date === date);
          const recurring = getRecurringCommitmentOccurrences(
            date,
            rules,
            commitments,
            overrides,
          );
          const fixedItems = [
            ...(plan?.commitments ?? []).map((item) => ({
              id: item.id,
              title: item.title,
              startTime: item.startTime,
              endTime: item.endTime,
              recurringId: undefined as string | undefined,
            })),
            ...recurring.map((item) => ({
              id: item.id,
              title: item.title,
              startTime: item.startTime,
              endTime: item.endTime,
              recurringId: item.recurringCommitmentId,
            })),
          ].sort(compareTimeRanges);
          const taskItems = (plan?.timeBlocks ?? []).flatMap((block) => {
            const task = tasks.find(
              (candidate) =>
                candidate.id === block.taskId &&
                candidate.status !== "completed",
            );
            return task ? [{ block, task }] : [];
          });
          const routineItems = getRoutineOccurrences(
            date,
            rules,
            routines,
            routineStates,
          );
          const isToday = date === today;
          const empty =
            fixedItems.length === 0 &&
            taskItems.length === 0 &&
            routineItems.length === 0;

          return (
            <View
              key={date}
              style={[styles.dayCard, isToday && styles.todayCard]}
            >
              <View style={styles.dayHeader}>
                <Text style={[styles.dayTitle, isToday && styles.todayText]}>
                  {formatDay(date)}
                </Text>
                {isToday ? <Text style={styles.todayBadge}>TODAY</Text> : null}
              </View>

              {fixedItems.map((item) => {
                const content = (
                  <>
                    <View style={styles.itemIcon}>
                      <Ionicons
                        color={colors.accent}
                        name={
                          item.recurringId ? "repeat-outline" : "time-outline"
                        }
                        size={16}
                      />
                    </View>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemMeta}>
                        {formatLocalTime(item.startTime)}–
                        {formatLocalTime(item.endTime)}
                      </Text>
                    </View>
                    {item.recurringId ? (
                      <Ionicons
                        color={colors.muted}
                        name="chevron-forward"
                        size={15}
                      />
                    ) : null}
                  </>
                );
                return item.recurringId ? (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      router.push(occurrenceHref(item.recurringId!, date))
                    }
                    style={styles.itemRow}
                  >
                    {content}
                  </Pressable>
                ) : (
                  <View key={item.id} style={styles.itemRow}>
                    {content}
                  </View>
                );
              })}

              {taskItems.map(({ block, task }) => (
                <View key={block.id} style={styles.itemRow}>
                  <View style={styles.itemIcon}>
                    <Ionicons
                      color={colors.should}
                      name="checkbox-outline"
                      size={16}
                    />
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemTitle}>{task.title}</Text>
                    <Text style={styles.itemMeta}>
                      {formatLocalTime(block.startTime)}–
                      {formatLocalTime(block.endTime)} · scheduled task
                    </Text>
                  </View>
                </View>
              ))}

              {routineItems.map((occurrence) => (
                <View key={occurrence.id} style={styles.itemRow}>
                  <View style={styles.itemIcon}>
                    <Ionicons
                      color={
                        occurrence.status === "completed"
                          ? colors.success
                          : colors.could
                      }
                      name={
                        occurrence.status === "completed"
                          ? "checkmark-circle"
                          : occurrence.status === "skipped"
                            ? "remove-circle-outline"
                            : "leaf-outline"
                      }
                      size={16}
                    />
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemTitle}>
                      {occurrence.routine.title}
                    </Text>
                    <Text style={styles.itemMeta}>
                      Routine · {occurrence.status}
                      {occurrence.routine.defaultTime
                        ? ` · ${formatLocalTime(occurrence.routine.defaultTime)}`
                        : ""}
                    </Text>
                  </View>
                </View>
              ))}

              {empty ? (
                <Text style={styles.empty}>
                  Open space. Nothing is required.
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  navButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  topTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.7,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  weekNav: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginVertical: spacing.xxl,
  },
  weekButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  rangeButton: { alignItems: "center", flex: 1 },
  rangeText: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  rangeSupport: {
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  days: { gap: spacing.md },
  dayCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  todayCard: { borderColor: colors.accent, borderWidth: 1 },
  dayHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  dayTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  todayText: { color: colors.accent },
  todayBadge: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
  },
  itemRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 58,
  },
  itemIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  itemCopy: { flex: 1 },
  itemTitle: {
    color: colors.text,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  itemMeta: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: 2,
    textTransform: "capitalize",
  },
  empty: {
    color: colors.muted,
    fontSize: typography.size.body,
    paddingVertical: spacing.md,
  },
});
