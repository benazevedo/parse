import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ModalHeader } from "@/components/ModalHeader";
import { TimeField } from "@/components/TimeField";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { getLocalDateKey } from "@/utils/time";

const choices = [10, 20, 30, 45, 60, 90] as const;

export default function PlanTaskScreen() {
  const params = useLocalSearchParams<{ taskId: string; date?: string }>();
  const date = params.date ?? getLocalDateKey();
  const task = useTaskStore((state) =>
    state.tasks.find((item) => item.id === params.taskId),
  );
  const block = useTaskStore((state) =>
    state.dayPlans
      .find((plan) => plan.date === date)
      ?.timeBlocks.find((item) => item.taskId === params.taskId),
  );
  const setTaskEstimate = useTaskStore((state) => state.setTaskEstimate);
  const scheduleTask = useTaskStore((state) => state.scheduleTask);
  const unscheduleTask = useTaskStore((state) => state.unscheduleTask);
  const initialEstimate = task?.estimatedMinutes;
  const [selectedEstimate, setSelectedEstimate] = useState<number | undefined>(
    initialEstimate,
  );
  const [customMode, setCustomMode] = useState(
    Boolean(
      initialEstimate &&
      !choices.includes(initialEstimate as (typeof choices)[number]),
    ),
  );
  const [customEstimate, setCustomEstimate] = useState(
    initialEstimate ? String(initialEstimate) : "",
  );
  const [startTime, setStartTime] = useState(block?.startTime ?? "");
  const [endTime, setEndTime] = useState(block?.endTime ?? "");
  const [error, setError] = useState<string>();

  if (!task) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <ModalHeader title="Plan task" />
        <View style={styles.missing}>
          <Text style={styles.heading}>This task is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const estimate = customMode
    ? customEstimate.trim()
      ? Number(customEstimate)
      : undefined
    : selectedEstimate;

  const chooseEstimate = (value?: number) => {
    setCustomMode(false);
    setSelectedEstimate(value);
    setError(undefined);
  };

  const saveEstimate = () => {
    const result = setTaskEstimate(task.id, estimate);
    if (!result.ok) setError(result.message);
    else router.back();
  };

  const saveSchedule = () => {
    const result = scheduleTask({
      date,
      taskId: task.id,
      startTime,
      endTime,
      estimatedMinutes: estimate,
    });
    if (!result.ok) setError(result.message);
    else router.back();
  };

  const confirmUnschedule = () => {
    Alert.alert(
      "Unschedule this task?",
      "The task will remain in Today with its priority and estimate.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unschedule",
          style: "destructive",
          onPress: () => {
            const result = unscheduleTask(date, task.id);
            if (result.ok) router.back();
            else setError(result.message);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ModalHeader title="Plan task" />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.icon}>
            <Ionicons color={colors.accent} name="time-outline" size={24} />
          </View>
          <Text style={styles.eyebrow}>
            {task.today ? "TODAY TASK" : "INCOMPLETE TASK"} · {date}
          </Text>
          <Text style={styles.heading}>{task.title}</Text>

          <Text style={styles.sectionLabel}>ESTIMATED DURATION</Text>
          <View style={styles.choices}>
            <Pressable
              onPress={() => chooseEstimate(undefined)}
              style={[
                styles.choice,
                !estimate && !customMode && styles.choiceSelected,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  !estimate && !customMode && styles.choiceTextSelected,
                ]}
              >
                None
              </Text>
            </Pressable>
            {choices.map((choice) => {
              const selected = !customMode && selectedEstimate === choice;
              return (
                <Pressable
                  key={choice}
                  onPress={() => chooseEstimate(choice)}
                  style={[styles.choice, selected && styles.choiceSelected]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      selected && styles.choiceTextSelected,
                    ]}
                  >
                    {choice} min
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setCustomMode(true)}
              style={[styles.choice, customMode && styles.choiceSelected]}
            >
              <Text
                style={[
                  styles.choiceText,
                  customMode && styles.choiceTextSelected,
                ]}
              >
                Custom
              </Text>
            </Pressable>
          </View>
          {customMode ? (
            <TextInput
              autoFocus
              keyboardType="number-pad"
              onChangeText={setCustomEstimate}
              placeholder="Minutes"
              placeholderTextColor={colors.disabled}
              style={styles.customInput}
              value={customEstimate}
            />
          ) : null}

          <Pressable
            onPress={saveEstimate}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryText}>Save estimate only</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.divider} />
          {task.today ? (
            <>
              <Text style={styles.sectionLabel}>
                {block ? "EDIT TIME BLOCK" : "SCHEDULE TIME BLOCK"}
              </Text>
              <Text style={styles.support}>
                Scheduling does not change Now. It simply states when you intend
                to work.
              </Text>
              <View style={styles.timeRow}>
                <TimeField
                  label="Starts"
                  onChangeText={setStartTime}
                  value={startTime}
                />
                <TimeField
                  label="Ends"
                  onChangeText={setEndTime}
                  value={endTime}
                />
              </View>
              <Text style={styles.timeHint}>Use 6:15 PM or 18:15.</Text>

              <Pressable
                onPress={saveSchedule}
                style={({ pressed }) => [
                  styles.save,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.saveText}>
                  {block ? "Update time block" : "Schedule task"}
                </Text>
              </Pressable>
              {block ? (
                <Pressable
                  onPress={confirmUnschedule}
                  style={({ pressed }) => [
                    styles.delete,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.deleteText}>Unschedule task</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <View style={styles.todayRequired}>
              <Ionicons
                color={colors.muted}
                name="calendar-outline"
                size={19}
              />
              <Text style={styles.todayRequiredText}>
                Add this task to Today before scheduling a time block.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  missing: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.4,
    marginTop: spacing.lg,
  },
  heading: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    lineHeight: 31,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    marginTop: spacing.xxl,
  },
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  choice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  choiceSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  choiceText: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  choiceTextSelected: { color: colors.surface },
  customInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    marginTop: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    minHeight: 36,
    justifyContent: "center",
  },
  secondaryText: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.xxl,
  },
  todayRequired: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  todayRequiredText: {
    color: colors.muted,
    flex: 1,
    fontSize: typography.size.body,
    lineHeight: 21,
  },
  support: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  timeRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  timeHint: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.sm,
  },
  error: {
    backgroundColor: colors.mustSoft,
    borderRadius: radii.sm,
    color: colors.must,
    fontSize: typography.size.body,
    lineHeight: 20,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  save: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    justifyContent: "center",
    marginTop: spacing.xxl,
    minHeight: 52,
  },
  saveText: {
    color: colors.surface,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  delete: { alignItems: "center", marginTop: spacing.lg, padding: spacing.md },
  deleteText: {
    color: colors.must,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  pressed: { opacity: 0.65 },
});
