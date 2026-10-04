import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import {
  Alert,
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

export default function OccurrenceScreen() {
  const { id, date = getLocalDateKey() } = useLocalSearchParams<{
    id: string;
    date?: string;
  }>();
  const template = useTaskStore((state) =>
    state.recurringCommitments.find((item) => item.id === id),
  );
  const override = useTaskStore((state) =>
    state.recurrenceOverrides.find(
      (item) => item.recurringCommitmentId === id && item.date === date,
    ),
  );
  const saveOccurrenceOverride = useTaskStore(
    (state) => state.saveOccurrenceOverride,
  );
  const skipOccurrence = useTaskStore((state) => state.skipOccurrence);
  const clearOccurrenceOverride = useTaskStore(
    (state) => state.clearOccurrenceOverride,
  );
  const [title, setTitle] = useState(override?.title ?? template?.title ?? "");
  const [startTime, setStartTime] = useState(
    override?.startTime ?? template?.startTime ?? "",
  );
  const [endTime, setEndTime] = useState(
    override?.endTime ?? template?.endTime ?? "",
  );
  const [notes, setNotes] = useState(override?.notes ?? template?.notes ?? "");
  const [error, setError] = useState<string>();

  if (!template) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <ModalHeader title="Edit occurrence" />
        <View style={styles.missing}>
          <Text style={styles.heading}>
            This recurring series is unavailable.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const save = () => {
    const result = saveOccurrenceOverride(template.id, date, {
      title,
      startTime,
      endTime,
      notes,
    });
    if (!result.ok) setError(result.message);
    else router.back();
  };

  const skip = () => {
    Alert.alert(
      "Skip only this occurrence?",
      `${template.title} will remain in the series on other dates.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip this date",
          style: "destructive",
          onPress: () => {
            const result = skipOccurrence(template.id, date);
            if (result.ok) router.back();
            else setError(result.message);
          },
        },
      ],
    );
  };

  const restore = () => {
    const result = clearOccurrenceOverride(template.id, date);
    if (!result.ok) setError(result.message);
    else router.back();
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ModalHeader title="Edit this occurrence" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.icon}>
          <Ionicons
            color={colors.accent}
            name="calendar-number-outline"
            size={24}
          />
        </View>
        <Text style={styles.eyebrow}>ONLY {date}</Text>
        <Text style={styles.heading}>{template.title}</Text>
        <Text style={styles.support}>
          Changes here do not alter the rest of the series.
        </Text>

        <Text style={styles.label}>Title</Text>
        <TextInput
          autoCapitalize="sentences"
          autoCorrect
          onChangeText={setTitle}
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
        <Text style={styles.label}>
          Notes <Text style={styles.optional}>optional</Text>
        </Text>
        <TextInput
          autoCapitalize="sentences"
          autoCorrect
          multiline
          onChangeText={setNotes}
          placeholder="Anything different about this date"
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
          <Text style={styles.saveText}>Save this occurrence</Text>
        </Pressable>
        <Pressable
          onPress={skip}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.skipText}>Skip this occurrence</Text>
        </Pressable>
        {override ? (
          <Pressable
            onPress={restore}
            style={({ pressed }) => [
              styles.secondary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryText}>Restore series version</Text>
          </Pressable>
        ) : null}
        <View style={styles.divider} />
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/rhythm/commitment/[id]",
              params: { id: template.id },
            } as unknown as Href)
          }
          style={({ pressed }) => [
            styles.seriesLink,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color={colors.accent} name="repeat-outline" size={18} />
          <Text style={styles.seriesText}>Edit the entire series</Text>
          <Ionicons color={colors.muted} name="chevron-forward" size={16} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
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
    marginTop: spacing.sm,
  },
  support: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
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
  notes: { minHeight: 90, paddingTop: spacing.lg },
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
  secondary: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  secondaryText: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  skipText: {
    color: colors.must,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
  },
  seriesLink: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  seriesText: {
    color: colors.ink,
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  pressed: { opacity: 0.65 },
});
