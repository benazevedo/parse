import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ModalHeader } from "@/components/ModalHeader";
import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { ActiveSlot } from "@/types/focus";

function SlotEditor({ slot }: { slot: ActiveSlot }) {
  const saveActiveSlot = useTaskStore((state) => state.saveActiveSlot);
  const projects = useTaskStore((state) => state.projects);
  const [name, setName] = useState(slot.name);
  const [maximum, setMaximum] = useState(String(slot.maxActiveProjects));
  const [enabled, setEnabled] = useState(slot.enabled);
  const usage = projects.filter(
    (project) =>
      project.status === "active" && project.activeSlotId === slot.id,
  ).length;

  const save = () => {
    const result = saveActiveSlot({
      ...slot,
      name,
      enabled,
      maxActiveProjects: Number(maximum),
    });
    if (!result.ok) Alert.alert("Slot not changed", result.message);
  };

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.usage}>
          {usage} active of {slot.maxActiveProjects}
        </Text>
        <Switch
          onValueChange={setEnabled}
          trackColor={{ false: colors.surfaceMuted, true: colors.accentSoft }}
          thumbColor={enabled ? colors.accent : colors.muted}
          value={enabled}
        />
      </View>
      <Text style={styles.label}>Slot name</Text>
      <TextInput
        onChangeText={setName}
        placeholder="Focus slot"
        placeholderTextColor={colors.disabled}
        style={styles.input}
        value={name}
      />
      <Text style={styles.label}>Maximum active projects</Text>
      <TextInput
        keyboardType="number-pad"
        onChangeText={setMaximum}
        style={styles.input}
        value={maximum}
      />
      <Pressable
        onPress={save}
        style={({ pressed }) => [styles.save, pressed && styles.pressed]}
      >
        <Text style={styles.saveText}>Save slot</Text>
      </Pressable>
    </View>
  );
}

export default function ActiveSlotSettingsScreen() {
  const slots = useTaskStore((state) => state.activeSlots);
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ModalHeader title="Active Slots" />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Make room for what matters.</Text>
          <Text style={styles.support}>
            Capacity changes never park work silently. Clear a slot before
            lowering or disabling it.
          </Text>
          {[...slots]
            .sort((a, b) => a.order - b.order)
            .map((slot) => (
              <SlotEditor key={slot.id} slot={slot} />
            ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
  },
  support: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 22,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  usage: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  label: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  save: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  saveText: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  pressed: { opacity: 0.65 },
});
