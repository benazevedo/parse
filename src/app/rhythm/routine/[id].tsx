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
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type {
  RecurrenceFrequency,
  RoutineDomain,
  Weekday,
} from "@/types/recurrence";
import { getLocalDateKey } from "@/utils/time";

const estimates = [10, 20, 30, 45, 60, 90];
const domains: RoutineDomain[] = [
  "family",
  "faith",
  "fitness",
  "home",
  "learning",
  "personal",
];

export default function RoutineFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const existing = useTaskStore((state) =>
    state.routines.find((item) => item.id === id),
  );
  const rule = useTaskStore((state) =>
    state.recurrenceRules.find(
      (item) => item.id === existing?.recurrenceRuleId,
    ),
  );
  const saveRoutine = useTaskStore((state) => state.saveRoutine);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [estimate, setEstimate] = useState<number | undefined>(
    existing?.estimatedMinutes,
  );
  const [customEstimate, setCustomEstimate] = useState(
    existing?.estimatedMinutes && !estimates.includes(existing.estimatedMinutes)
      ? String(existing.estimatedMinutes)
      : "",
  );
  const [defaultTime, setDefaultTime] = useState(existing?.defaultTime ?? "");
  const [domain, setDomain] = useState<RoutineDomain | undefined>(
    existing?.domain,
  );
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    rule?.frequency ?? "daily",
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>(
    rule?.selectedWeekdays ?? [],
  );
  const [startDate, setStartDate] = useState(
    rule?.startDate ?? getLocalDateKey(),
  );
  const [endDate, setEndDate] = useState(rule?.endDate ?? "");
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [error, setError] = useState<string>();

  const resolvedEstimate = customEstimate.trim()
    ? Number(customEstimate)
    : estimate;
  const save = () => {
    const result = saveRoutine(
      {
        title,
        estimatedMinutes: resolvedEstimate,
        defaultTime,
        domain,
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
        <ModalHeader title={existing ? "Edit routine" : "New routine"} />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.icon}>
            <Ionicons color={colors.accent} name="leaf-outline" size={24} />
          </View>
          <Text style={styles.eyebrow}>ROUTINE</Text>
          <Text style={styles.heading}>What belongs in your rhythm?</Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            autoCapitalize="sentences"
            autoCorrect
            onChangeText={setTitle}
            placeholder="Pray, read, mobility…"
            placeholderTextColor={colors.disabled}
            style={styles.input}
            value={title}
          />

          <Text style={styles.label}>Estimated duration</Text>
          <View style={styles.chips}>
            <Pressable
              onPress={() => {
                setEstimate(undefined);
                setCustomEstimate("");
              }}
              style={[styles.chip, !resolvedEstimate && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipText,
                  !resolvedEstimate && styles.chipTextSelected,
                ]}
              >
                None
              </Text>
            </Pressable>
            {estimates.map((minutes) => (
              <Pressable
                key={minutes}
                onPress={() => {
                  setEstimate(minutes);
                  setCustomEstimate("");
                }}
                style={[
                  styles.chip,
                  resolvedEstimate === minutes && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    resolvedEstimate === minutes && styles.chipTextSelected,
                  ]}
                >
                  {minutes}m
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setCustomEstimate}
            placeholder="Custom minutes"
            placeholderTextColor={colors.disabled}
            style={[styles.input, styles.compactInput]}
            value={customEstimate}
          />

          <Text style={styles.label}>
            Default time{" "}
            <Text style={styles.optional}>optional, not a commitment</Text>
          </Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={setDefaultTime}
            placeholder="7:00 AM"
            placeholderTextColor={colors.disabled}
            style={styles.input}
            value={defaultTime}
          />

          <Text style={styles.label}>
            Domain <Text style={styles.optional}>optional</Text>
          </Text>
          <View style={styles.chips}>
            {domains.map((item) => (
              <Pressable
                key={item}
                onPress={() => setDomain(domain === item ? undefined : item)}
                style={[styles.chip, domain === item && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    domain === item && styles.chipTextSelected,
                  ]}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </Text>
              </Pressable>
            ))}
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

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={save}
            style={({ pressed }) => [styles.save, pressed && styles.pressed]}
          >
            <Text style={styles.saveText}>Save routine</Text>
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
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  compactInput: { marginTop: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  chipSelected: { backgroundColor: colors.accent },
  chipText: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  chipTextSelected: { color: colors.surface },
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
