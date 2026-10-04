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

export default function CommitmentScreen() {
  const params = useLocalSearchParams<{ date?: string; id?: string }>();
  const date = params.date ?? getLocalDateKey();
  const existing = useTaskStore((state) =>
    state.dayPlans
      .find((plan) => plan.date === date)
      ?.commitments.find((item) => item.id === params.id),
  );
  const saveCommitment = useTaskStore((state) => state.saveCommitment);
  const deleteCommitment = useTaskStore((state) => state.deleteCommitment);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [startTime, setStartTime] = useState(existing?.startTime ?? "");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string>();

  const save = () => {
    const result = saveCommitment(
      { date, title, startTime, endTime, notes },
      existing?.id,
    );
    if (!result.ok) {
      setError(result.message ?? "This commitment could not be saved.");
      return;
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(
      "Delete commitment?",
      "Tasks and their estimates will not be changed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const result = deleteCommitment(date, existing.id);
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
        <ModalHeader title={existing ? "Edit commitment" : "Add commitment"} />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.icon}>
            <Ionicons color={colors.accent} name="calendar-outline" size={23} />
          </View>
          <Text style={styles.eyebrow}>FIXED TIME · {date}</Text>
          <Text style={styles.heading}>What is already spoken for?</Text>
          <Text style={styles.support}>
            This is one date only. Use Life → Weekly Rhythm for a repeating
            commitment.
          </Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            autoCapitalize="sentences"
            autoCorrect
            onChangeText={setTitle}
            placeholder="Work, commute, appointment…"
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
          <Text style={styles.timeHint}>Use 6:00 AM or 18:00.</Text>

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
            <Text style={styles.saveText}>Save commitment</Text>
          </Pressable>
          {existing ? (
            <Pressable
              onPress={confirmDelete}
              style={({ pressed }) => [
                styles.delete,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.deleteText}>Delete commitment</Text>
            </Pressable>
          ) : null}
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
  support: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 21,
    marginBottom: spacing.lg,
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
  notes: { minHeight: 100, paddingTop: spacing.lg },
  timeRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
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
