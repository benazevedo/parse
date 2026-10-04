import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
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
import { RecurrenceFields } from "@/components/RecurrenceFields";
import { TimeField } from "@/components/TimeField";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { RecurrenceFrequency, Weekday } from "@/types/recurrence";
import { getLocalDateKey } from "@/utils/time";

export default function RecurringCommitmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const existing = useTaskStore((state) =>
    state.recurringCommitments.find((item) => item.id === id),
  );
  const rule = useTaskStore((state) =>
    state.recurrenceRules.find(
      (item) => item.id === existing?.recurrenceRuleId,
    ),
  );
  const saveRecurringCommitment = useTaskStore(
    (state) => state.saveRecurringCommitment,
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [startTime, setStartTime] = useState(existing?.startTime ?? "");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    rule?.frequency ?? "selected_weekdays",
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>(
    rule?.selectedWeekdays ?? ["mon", "tue", "wed", "thu"],
  );
  const [startDate, setStartDate] = useState(
    rule?.startDate ?? getLocalDateKey(),
  );
  const [endDate, setEndDate] = useState(rule?.endDate ?? "");
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [error, setError] = useState<string>();

  const save = () => {
    const result = saveRecurringCommitment(
      {
        title,
        startTime,
        endTime,
        notes,
        frequency,
        selectedWeekdays,
        startDate,
        endDate,
        enabled,
      },
      existing?.id,
    );
    if (!result.ok) setError(result.message);
    else router.back();
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ModalHeader
          title={existing ? "Edit commitment series" : "New commitment series"}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.icon}>
            <Ionicons color={colors.accent} name="repeat-outline" size={24} />
          </View>
          <Text style={styles.eyebrow}>RECURRING COMMITMENT</Text>
          <Text style={styles.heading}>Protect the time that repeats.</Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            autoCapitalize="sentences"
            autoCorrect
            onChangeText={setTitle}
            placeholder="Work, commute, church…"
            placeholderTextColor={colors.disabled}
            style={styles.input}
            value={title}
          />
          <View style={styles.timeRow}>
            <TimeField
              label="Starts"
              onChangeText={setStartTime}
              value={startTime}
            />
            <TimeField label="Ends" onChangeText={setEndTime} value={endTime} />
          </View>

          <RecurrenceFields
            enabled={enabled}
            endDate={endDate}
            frequency={frequency}
            onEnabledChange={setEnabled}
            onEndDateChange={setEndDate}
            onFrequencyChange={setFrequency}
            onSelectedWeekdaysChange={setSelectedWeekdays}
            onStartDateChange={setStartDate}
            selectedWeekdays={selectedWeekdays}
            startDate={startDate}
          />

          <Text style={styles.label}>
            Notes <Text style={styles.optional}>optional</Text>
          </Text>
          <TextInput
            autoCapitalize="sentences"
            autoCorrect
            multiline
            onChangeText={setNotes}
            placeholder="Anything useful to remember"
            placeholderTextColor={colors.disabled}
            style={[styles.input, styles.notes]}
            textAlignVertical="top"
            value={notes}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={save}
            style={({ pressed }) => [styles.save, pressed && styles.pressed]}
          >
            <Text style={styles.saveText}>Save series</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
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
    marginTop: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  optional: { color: colors.muted, fontWeight: typography.weight.regular },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.body,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  notes: { minHeight: 96, paddingTop: spacing.lg },
  timeRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
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
  pressed: { opacity: 0.65 },
});
