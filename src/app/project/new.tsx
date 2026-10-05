import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
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

import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { ProjectStatus } from "@/types/project";

const statuses: Exclude<ProjectStatus, "completed">[] = [
  "active",
  "parked",
  "someday",
];

export default function CreateProjectScreen() {
  const createProject = useTaskStore((state) => state.createProject);
  const activeSlots = useTaskStore((state) => state.activeSlots);
  const [title, setTitle] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [status, setStatus] =
    useState<Exclude<ProjectStatus, "completed">>("active");
  const [activeSlotId, setActiveSlotId] = useState<string | undefined>();
  const canSave = Boolean(title.trim() && desiredOutcome.trim());

  const save = () => {
    if (!canSave) return;
    const result = createProject({
      title,
      desiredOutcome,
      status,
      activeSlotId: status === "active" ? activeSlotId : undefined,
    });
    if (!result.ok || !result.projectId) {
      Alert.alert("Could not create project", result.message);
      return;
    }
    router.replace({
      pathname: "/project/[id]",
      params: { id: result.projectId },
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.headerSide}
          >
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>New Project</Text>
          <View style={styles.headerSide} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.icon}>
            <Ionicons color={colors.accent} name="layers-outline" size={24} />
          </View>

          <Text style={styles.eyebrow}>NAME THE OUTCOME</Text>
          <Text style={styles.prompt}>
            What will be meaningfully different when this is done?
          </Text>

          <Text style={styles.label}>Project title</Text>
          <TextInput
            autoFocus
            onChangeText={setTitle}
            placeholder="Finish nursery"
            placeholderTextColor={colors.disabled}
            style={styles.input}
            value={title}
          />
          <Text style={styles.label}>Desired outcome</Text>
          <TextInput
            multiline
            onChangeText={setDesiredOutcome}
            placeholder="Nursery is completely ready before the baby arrives."
            placeholderTextColor={colors.disabled}
            style={[styles.input, styles.outcomeInput]}
            textAlignVertical="top"
            value={desiredOutcome}
          />

          <Text style={styles.label}>Initial status</Text>
          <View style={styles.statuses}>
            {statuses.map((option) => {
              const selected = status === option;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={option}
                  onPress={() => setStatus(option)}
                  style={[styles.status, selected && styles.statusSelected]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      selected && styles.statusTextSelected,
                    ]}
                  >
                    {option[0].toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {status === "active" ? (
            <>
              <Text style={styles.label}>Focus slot (optional)</Text>
              <Text style={styles.support}>
                Foundational work can stay active without a slot.
              </Text>
              <View style={styles.slotList}>
                <Pressable
                  onPress={() => setActiveSlotId(undefined)}
                  style={[styles.slot, !activeSlotId && styles.statusSelected]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      !activeSlotId && styles.statusTextSelected,
                    ]}
                  >
                    No slot
                  </Text>
                </Pressable>
                {activeSlots
                  .filter((slot) => slot.enabled)
                  .sort((a, b) => a.order - b.order)
                  .map((slot) => {
                    const selected = activeSlotId === slot.id;
                    return (
                      <Pressable
                        key={slot.id}
                        onPress={() => setActiveSlotId(slot.id)}
                        style={[styles.slot, selected && styles.statusSelected]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            selected && styles.statusTextSelected,
                          ]}
                        >
                          {slot.name}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            </>
          ) : null}

          <Pressable
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={save}
            style={({ pressed }) => [
              styles.save,
              !canSave && styles.saveDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.saveText, !canSave && styles.saveTextDisabled]}
            >
              Create project
            </Text>
            <Ionicons
              color={canSave ? colors.surface : colors.muted}
              name="arrow-forward"
              size={19}
            />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  headerSide: { justifyContent: "center", minHeight: 40, width: 72 },
  cancel: { color: colors.accent, fontSize: typography.size.body },
  headerTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  icon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.6,
    marginTop: spacing.xl,
  },
  prompt: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    lineHeight: 31,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    minHeight: 56,
    padding: spacing.lg,
  },
  outcomeInput: { minHeight: 112 },
  statuses: { flexDirection: "row", gap: spacing.sm },
  support: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginBottom: spacing.sm,
  },
  slotList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slot: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: "transparent",
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  status: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: "transparent",
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  statusSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  statusText: {
    color: colors.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  statusTextSelected: { color: colors.accent },
  save: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.xxl,
    minHeight: 54,
  },
  saveDisabled: { backgroundColor: colors.surfaceMuted },
  saveText: {
    color: colors.surface,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  saveTextDisabled: { color: colors.muted },
  pressed: { opacity: 0.66 },
});
