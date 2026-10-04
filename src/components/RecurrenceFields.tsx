import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { RecurrenceFrequency, Weekday } from "@/types/recurrence";
import { WEEKDAYS } from "@/types/recurrence";

interface RecurrenceFieldsProps {
  frequency: RecurrenceFrequency;
  selectedWeekdays: Weekday[];
  startDate: string;
  endDate: string;
  enabled: boolean;
  onFrequencyChange: (frequency: RecurrenceFrequency) => void;
  onSelectedWeekdaysChange: (weekdays: Weekday[]) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onEnabledChange: (enabled: boolean) => void;
}

const frequencies: { value: RecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "selected_weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
];

export function RecurrenceFields({
  frequency,
  selectedWeekdays,
  startDate,
  endDate,
  enabled,
  onFrequencyChange,
  onSelectedWeekdaysChange,
  onStartDateChange,
  onEndDateChange,
  onEnabledChange,
}: RecurrenceFieldsProps) {
  const toggleWeekday = (weekday: Weekday) => {
    onSelectedWeekdaysChange(
      selectedWeekdays.includes(weekday)
        ? selectedWeekdays.filter((item) => item !== weekday)
        : [...selectedWeekdays, weekday],
    );
  };

  return (
    <>
      <Text style={styles.label}>Repeats</Text>
      <View style={styles.segmented}>
        {frequencies.map((item) => {
          const selected = frequency === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => onFrequencyChange(item.value)}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              <Text
                style={[
                  styles.segmentText,
                  selected && styles.segmentTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {frequency === "selected_weekdays" ? (
        <View style={styles.weekdays}>
          {WEEKDAYS.map((weekday) => {
            const selected = selectedWeekdays.includes(weekday);
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={weekday}
                onPress={() => toggleWeekday(weekday)}
                style={[styles.weekday, selected && styles.weekdaySelected]}
              >
                <Text
                  style={[
                    styles.weekdayText,
                    selected && styles.weekdayTextSelected,
                  ]}
                >
                  {weekday[0].toUpperCase() + weekday.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.label}>Starts</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onStartDateChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.disabled}
            style={styles.input}
            value={startDate}
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.label}>
            Ends <Text style={styles.optional}>optional</Text>
          </Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onEndDateChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.disabled}
            style={styles.input}
            value={endDate}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        onPress={() => onEnabledChange(!enabled)}
        style={styles.enabledRow}
      >
        <View style={[styles.switch, enabled && styles.switchEnabled]}>
          <View style={[styles.knob, enabled && styles.knobEnabled]} />
        </View>
        <View style={styles.enabledCopy}>
          <Text style={styles.enabledTitle}>
            {enabled ? "Series enabled" : "Series paused"}
          </Text>
          <Text style={styles.enabledSupport}>
            {enabled
              ? "Future occurrences will appear automatically."
              : "Past dates remain; future occurrences stop."}
          </Text>
        </View>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  optional: { color: colors.muted, fontWeight: typography.weight.regular },
  segmented: { flexDirection: "row", gap: spacing.sm },
  segment: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.sm,
  },
  segmentSelected: { backgroundColor: colors.accent },
  segmentText: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  segmentTextSelected: { color: colors.surface },
  weekdays: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  weekday: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  weekdaySelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  weekdayText: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  weekdayTextSelected: { color: colors.surface },
  dateRow: { flexDirection: "row", gap: spacing.md },
  dateField: { flex: 1 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.body,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  enabledRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  switch: {
    backgroundColor: colors.disabled,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 48,
  },
  switchEnabled: { backgroundColor: colors.accent },
  knob: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 22,
    width: 22,
  },
  knobEnabled: { alignSelf: "flex-end" },
  enabledCopy: { flex: 1 },
  enabledTitle: {
    color: colors.ink,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  enabledSupport: {
    color: colors.muted,
    fontSize: typography.size.caption,
    lineHeight: 17,
    marginTop: 2,
  },
});
