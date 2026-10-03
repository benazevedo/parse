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

import { useTaskStore } from "@/store/task-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function ParseProjectScreen() {
  const { id, parentStepId, mode } = useLocalSearchParams<{
    id: string;
    parentStepId?: string;
    mode?: string;
  }>();
  const project = useTaskStore((state) =>
    state.projects.find((item) => item.id === id),
  );
  const parentStep = useTaskStore((state) =>
    state.projectSteps.find((step) => step.id === parentStepId),
  );
  const addProjectSteps = useTaskStore((state) => state.addProjectSteps);
  const [stepText, setStepText] = useState("");
  const titles = stepText
    .split("\n")
    .map((title) => title.trim())
    .filter(Boolean);
  const canSave = Boolean(project && titles.length);
  const parentTitle = parentStep?.title ?? project?.title;
  const isAddMode = mode === "add";

  const save = () => {
    if (!project || !canSave) return;
    const result = addProjectSteps(project.id, parentStep?.id, titles);
    if (!result.ok) {
      Alert.alert("Could not add steps", result.message);
      return;
    }
    router.back();
  };

  if (!project) {
    return (
      <SafeAreaView style={styles.missing}>
        <Text style={styles.missingTitle}>Project not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>
            {isAddMode ? "Add Step" : "Parse"}
          </Text>
          <View style={styles.headerSide} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.relationship}>
            <Text style={styles.relationshipLabel}>PARENT OUTCOME</Text>
            <Text style={styles.parentTitle}>{parentTitle}</Text>
            <View style={styles.arrow}>
              <Ionicons color={colors.accent} name="arrow-down" size={19} />
            </View>
            <Text style={styles.relationshipLabel}>SMALLER ACTIONS</Text>
          </View>

          <Text style={styles.prompt}>
            {isAddMode
              ? "Add a concrete step."
              : "Break this outcome into smaller pieces."}
          </Text>
          <Text style={styles.support}>
            Enter one step per line. Keep parsing until the next physical action
            is obvious.
          </Text>
          <TextInput
            autoFocus
            multiline
            onChangeText={setStepText}
            placeholder={
              parentStep
                ? "Measure final section\nCut three boards"
                : "Finish south wall"
            }
            placeholderTextColor={colors.disabled}
            style={styles.input}
            textAlignVertical="top"
            value={stepText}
          />
          <Text style={styles.count}>
            {titles.length} {titles.length === 1 ? "step" : "steps"} ready
          </Text>
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
              Add smaller {titles.length === 1 ? "step" : "steps"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  missing: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
    padding: spacing.xl,
  },
  missingTitle: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
  },
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
  relationship: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
  },
  relationshipLabel: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.4,
  },
  parentTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: 24,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  arrow: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    marginVertical: spacing.lg,
    width: 36,
  },
  prompt: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    marginTop: spacing.xxl,
  },
  support: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: 22,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    lineHeight: 27,
    minHeight: 150,
    padding: spacing.lg,
  },
  count: {
    color: colors.muted,
    fontSize: typography.size.caption,
    marginTop: spacing.sm,
    textAlign: "right",
  },
  save: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    justifyContent: "center",
    marginTop: spacing.xl,
    minHeight: 52,
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
