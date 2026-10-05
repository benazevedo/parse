import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
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

export default function CaptureScreen() {
  const captureThought = useTaskStore((state) => state.captureThought);
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const canSave = content.trim().length > 0;

  const save = () => {
    if (!canSave) return;

    const result = captureThought({ content, notes, source: "typed" });
    if (!result.ok) return;

    Keyboard.dismiss();
    router.back();
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Capture</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.promptIcon}>
            <Ionicons color={colors.accent} name="add" size={25} />
          </View>
          <Text style={styles.eyebrow}>CAPTURE FIRST</Text>
          <Text style={styles.prompt}>
            What is taking up space in your mind?
          </Text>
          <Text style={styles.support}>
            Organize it later. Just get it out.
          </Text>

          <Text style={styles.label}>Thought</Text>
          <TextInput
            autoCapitalize="sentences"
            autoCorrect
            autoFocus
            multiline
            onChangeText={setContent}
            placeholder="Look into solar battery backup for house"
            placeholderTextColor={colors.disabled}
            style={styles.titleInput}
            textAlignVertical="top"
            value={content}
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
            style={styles.notesInput}
            textAlignVertical="top"
            value={notes}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={save}
            style={({ pressed }) => [
              styles.saveButton,
              !canSave && styles.saveButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={canSave ? colors.surface : colors.muted}
              name="arrow-forward"
              size={20}
            />
            <Text
              style={[styles.saveText, !canSave && styles.saveTextDisabled]}
            >
              Save to Inbox
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
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
  headerButton: {
    justifyContent: "center",
    minHeight: 40,
    width: 72,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  cancelText: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  promptIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: "center",
    marginTop: spacing.md,
    width: 48,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.7,
    marginTop: spacing.xl,
  },
  prompt: {
    color: colors.ink,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.3,
    lineHeight: 31,
    marginTop: spacing.sm,
  },
  support: {
    color: colors.muted,
    fontSize: typography.size.body,
    marginBottom: spacing.xxl,
    marginTop: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  optional: {
    color: colors.muted,
    fontWeight: typography.weight.regular,
  },
  titleInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    lineHeight: 24,
    minHeight: 112,
    padding: spacing.lg,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.body,
    lineHeight: 22,
    minHeight: 120,
    padding: spacing.lg,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flexDirection: "row-reverse",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.xxl,
    minHeight: 54,
    paddingHorizontal: spacing.xl,
  },
  saveButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  saveText: {
    color: colors.surface,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  saveTextDisabled: {
    color: colors.muted,
  },
  pressed: {
    opacity: 0.68,
  },
});
