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
import {
  KNOWLEDGE_DOMAINS,
  KNOWLEDGE_KINDS,
  type KnowledgeDomain,
  type KnowledgeKind,
} from "@/types/capture";

function titleCase(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

export default function KnowledgeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const knowledgeItems = useTaskStore((state) => state.knowledgeItems);
  const updateKnowledgeItem = useTaskStore(
    (state) => state.updateKnowledgeItem,
  );
  const setKnowledgeArchived = useTaskStore(
    (state) => state.setKnowledgeArchived,
  );
  const item = knowledgeItems.find((candidate) => candidate.id === id);
  const [title, setTitle] = useState(item?.title ?? "");
  const [content, setContent] = useState(item?.content ?? "");
  const [kind, setKind] = useState<KnowledgeKind>(item?.kind ?? "idea");
  const [domain, setDomain] = useState<KnowledgeDomain | undefined>(
    item?.domain,
  );

  const save = () => {
    if (!item) return;
    const result = updateKnowledgeItem(item.id, {
      title,
      content,
      kind,
      domain,
    });
    if (!result.ok) {
      Alert.alert("Not saved", result.message);
      return;
    }
    router.back();
  };

  const toggleArchived = () => {
    if (!item) return;
    const archived = !item.archivedAt;
    Alert.alert(
      archived ? "Archive this item?" : "Restore this item?",
      archived
        ? "It will stay available on the Archived shelf."
        : "It will return to its original shelf.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: archived ? "Archive" : "Restore",
          onPress: () => {
            const result = setKnowledgeArchived(item.id, archived);
            if (!result.ok) Alert.alert("Not changed", result.message);
            else router.back();
          },
        },
      ],
    );
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>
            This knowledge item is unavailable.
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>Return to Knowledge</Text>
          </Pressable>
        </View>
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
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Text style={styles.link}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {item.disposition === "someday" ? "Someday" : "Knowledge"}
          </Text>
          <Pressable
            onPress={save}
            style={[styles.headerButton, styles.saveHeader]}
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {item.disposition === "someday" ? (
            <View style={styles.somedayBanner}>
              <Ionicons color={colors.accent} name="cloud-outline" size={19} />
              <Text style={styles.somedayText}>
                Not now doesn’t mean never.
              </Text>
            </View>
          ) : null}
          <Text style={styles.label}>TITLE</Text>
          <TextInput
            onChangeText={setTitle}
            placeholderTextColor={colors.disabled}
            style={styles.input}
            value={title}
          />

          <Text style={styles.label}>CONTENT</Text>
          <TextInput
            multiline
            onChangeText={setContent}
            placeholderTextColor={colors.disabled}
            style={[styles.input, styles.contentInput]}
            textAlignVertical="top"
            value={content}
          />

          <Text style={styles.label}>KIND</Text>
          <View style={styles.chips}>
            {KNOWLEDGE_KINDS.map((option) => (
              <Choice
                key={option}
                label={titleCase(option)}
                onPress={() => setKind(option)}
                selected={kind === option}
              />
            ))}
          </View>

          <Text style={styles.label}>DOMAIN</Text>
          <View style={styles.chips}>
            <Choice
              label="None"
              onPress={() => setDomain(undefined)}
              selected={!domain}
            />
            {KNOWLEDGE_DOMAINS.map((option) => (
              <Choice
                key={option}
                label={titleCase(option)}
                onPress={() => setDomain(option)}
                selected={domain === option}
              />
            ))}
          </View>

          {item.sourceCaptureId ? (
            <Text style={styles.source}>CREATED FROM CAPTURE</Text>
          ) : null}
          <Pressable onPress={toggleArchived} style={styles.archiveButton}>
            <Ionicons
              color={colors.muted}
              name={item.archivedAt ? "arrow-undo-outline" : "archive-outline"}
              size={18}
            />
            <Text style={styles.archiveText}>
              {item.archivedAt ? "Restore from Archive" : "Archive"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
        {label}
      </Text>
    </Pressable>
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
  headerButton: { justifyContent: "center", minHeight: 40, width: 72 },
  saveHeader: { alignItems: "flex-end" },
  headerTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  link: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  saveText: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  somedayBanner: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  somedayText: {
    color: colors.accent,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  label: {
    color: colors.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.3,
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
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  contentInput: { lineHeight: 22, minHeight: 180, padding: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.lg,
  },
  choiceSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  choiceText: {
    color: colors.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  choiceTextSelected: {
    color: colors.accent,
    fontWeight: typography.weight.bold,
  },
  source: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    marginTop: spacing.xxl,
    textAlign: "center",
  },
  archiveButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  archiveText: {
    color: colors.muted,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  missing: {
    alignItems: "center",
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
    padding: spacing.xl,
  },
  missingTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    textAlign: "center",
  },
});
