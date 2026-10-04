import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { RecurrenceActionResult } from "@/types/recurrence";
import { describeRecurrence } from "@/utils/recurrence";
import { formatLocalTime } from "@/utils/time";

function showResult(result: RecurrenceActionResult) {
  if (!result.ok) Alert.alert("Not changed", result.message);
}

function rhythmHref(kind: "commitment" | "routine", id: string): Href {
  return {
    pathname:
      kind === "commitment"
        ? "/rhythm/commitment/[id]"
        : "/rhythm/routine/[id]",
    params: { id },
  } as unknown as Href;
}

export default function RhythmScreen() {
  const rules = useTaskStore((state) => state.recurrenceRules);
  const commitments = useTaskStore((state) => state.recurringCommitments);
  const routines = useTaskStore((state) => state.routines);
  const saveRecurringCommitment = useTaskStore(
    (state) => state.saveRecurringCommitment,
  );
  const saveRoutine = useTaskStore((state) => state.saveRoutine);

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Back to Life"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons color={colors.accent} name="chevron-back" size={23} />
        </Pressable>
        <Text style={styles.topTitle}>Weekly Rhythm</Text>
        <View style={styles.back} />
      </View>

      <Text style={styles.eyebrow}>RHYTHM</Text>
      <Text style={styles.title}>What normally happens?</Text>
      <Text style={styles.subtitle}>
        Recurring structure should reduce planning, not create another system to
        maintain.
      </Text>

      <View style={styles.createRow}>
        <Pressable
          onPress={() => router.push(rhythmHref("commitment", "new"))}
          style={({ pressed }) => [
            styles.createCard,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.createIcon}>
            <Ionicons color={colors.accent} name="calendar-outline" size={20} />
          </View>
          <Text style={styles.createTitle}>Commitment</Text>
          <Text style={styles.createSupport}>Fixed repeating time</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(rhythmHref("routine", "new"))}
          style={({ pressed }) => [
            styles.createCard,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.createIcon}>
            <Ionicons color={colors.accent} name="leaf-outline" size={20} />
          </View>
          <Text style={styles.createTitle}>Routine</Text>
          <Text style={styles.createSupport}>A regular intention</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>RECURRING COMMITMENTS</Text>
        <Text style={styles.count}>{commitments.length}</Text>
      </View>
      {commitments.length ? (
        <View style={styles.list}>
          {commitments.map((item) => {
            const rule = rules.find(
              (candidate) => candidate.id === item.recurrenceRuleId,
            );
            return (
              <View
                key={item.id}
                style={[styles.itemCard, !item.enabled && styles.disabledCard]}
              >
                <Pressable
                  onPress={() => router.push(rhythmHref("commitment", item.id))}
                  style={({ pressed }) => [
                    styles.itemMain,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.itemIcon}>
                    <Ionicons
                      color={colors.accent}
                      name="repeat-outline"
                      size={18}
                    />
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemMeta}>
                      {formatLocalTime(item.startTime)}–
                      {formatLocalTime(item.endTime)} ·{" "}
                      {describeRecurrence(rule)}
                    </Text>
                  </View>
                  <Ionicons
                    color={colors.muted}
                    name="chevron-forward"
                    size={17}
                  />
                </Pressable>
                <Pressable
                  onPress={() =>
                    showResult(
                      saveRecurringCommitment(
                        {
                          title: item.title,
                          startTime: item.startTime,
                          endTime: item.endTime,
                          notes: item.notes,
                          frequency: rule?.frequency ?? "daily",
                          selectedWeekdays: rule?.selectedWeekdays,
                          startDate: rule?.startDate ?? "",
                          endDate: rule?.endDate,
                          enabled: !item.enabled,
                        },
                        item.id,
                      ),
                    )
                  }
                  style={styles.toggleButton}
                >
                  <Text style={styles.toggleText}>
                    {item.enabled ? "Pause" : "Enable"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon="calendar-outline"
          message="Add work, commutes, church, or other fixed time that normally repeats."
          title="No recurring commitments"
        />
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>ROUTINES</Text>
        <Text style={styles.count}>{routines.length}</Text>
      </View>
      {routines.length ? (
        <View style={styles.list}>
          {routines.map((routine) => {
            const rule = rules.find(
              (candidate) => candidate.id === routine.recurrenceRuleId,
            );
            return (
              <View
                key={routine.id}
                style={[
                  styles.itemCard,
                  !routine.enabled && styles.disabledCard,
                ]}
              >
                <Pressable
                  onPress={() => router.push(rhythmHref("routine", routine.id))}
                  style={({ pressed }) => [
                    styles.itemMain,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.itemIcon}>
                    <Ionicons
                      color={colors.accent}
                      name="leaf-outline"
                      size={18}
                    />
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemTitle}>{routine.title}</Text>
                    <Text style={styles.itemMeta}>
                      {describeRecurrence(rule)}
                      {routine.estimatedMinutes
                        ? ` · ${routine.estimatedMinutes} min`
                        : ""}
                      {routine.domain ? ` · ${routine.domain}` : ""}
                    </Text>
                  </View>
                  <Ionicons
                    color={colors.muted}
                    name="chevron-forward"
                    size={17}
                  />
                </Pressable>
                <Pressable
                  onPress={() =>
                    showResult(
                      saveRoutine(
                        {
                          title: routine.title,
                          estimatedMinutes: routine.estimatedMinutes,
                          defaultTime: routine.defaultTime,
                          domain: routine.domain,
                          frequency: rule?.frequency ?? "daily",
                          selectedWeekdays: rule?.selectedWeekdays,
                          startDate: rule?.startDate ?? "",
                          endDate: rule?.endDate,
                          enabled: !routine.enabled,
                        },
                        routine.id,
                      ),
                    )
                  }
                  style={styles.toggleButton}
                >
                  <Text style={styles.toggleText}>
                    {routine.enabled ? "Pause" : "Enable"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon="leaf-outline"
          message="Add something you want to return to regularly, without turning it into a fixed appointment."
          title="No routines yet"
        />
      )}
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
  back: {
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
  createRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xxl },
  createCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    flex: 1,
    padding: spacing.lg,
  },
  createIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 38,
  },
  createTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  createSupport: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.xxxl,
  },
  sectionLabel: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.4,
  },
  count: { color: colors.muted, fontSize: typography.size.caption },
  list: { gap: spacing.md },
  itemCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  disabledCard: { opacity: 0.62 },
  itemMain: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  itemIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  itemCopy: { flex: 1 },
  itemTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  itemMeta: {
    color: colors.muted,
    fontSize: typography.size.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  toggleButton: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
    justifyContent: "center",
  },
  toggleText: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  pressed: { opacity: 0.65 },
});
